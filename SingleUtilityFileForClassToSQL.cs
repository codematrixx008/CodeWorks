using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;

// using NetSuiteService; // <-- Uncomment/use your WSDL namespace

#region Models

public class NetSuiteModelClassTableColumn
{
    public string ColumnName { get; set; }
    public string ColumnType { get; set; } // SQL type
    public bool IsNullable { get; set; } = true;
}

public class NetSuiteModelClassTable
{
    public string TableName { get; set; }
    public List<NetSuiteModelClassTableColumn> Columns { get; set; } = new List<NetSuiteModelClassTableColumn>();

    // Optional relational hints
    public string PrimaryKeyColumn { get; set; } // e.g., "internalId"
    public string ParentTableName { get; set; }  // when this is a child table
    public string ParentPkColumn { get; set; }   // e.g., "internalId"
    public string ForeignKeyColumn { get; set; } // e.g., "Invoice_internalId"
}

#endregion

public static class NetSuiteSchemaBuilder
{
    /// <summary>
    /// Extract table definitions for the given NetSuite SOAP record instance (e.g., Invoice).
    /// This will create a main table and child tables for any *List wrappers.
    /// </summary>
    public static List<NetSuiteModelClassTable> ExtractTableDefinitions<T>(T sample, string rootTableName = null)
    {
        if (sample == null) throw new ArgumentNullException(nameof(sample));
        var type = sample.GetType();
        return ExtractTableDefinitions(type, rootTableName ?? type.Name);
    }

    /// <summary>
    /// Extract table definitions for the given NetSuite SOAP record type (e.g., typeof(Invoice)).
    /// </summary>
    public static List<NetSuiteModelClassTable> ExtractTableDefinitions(Type rootType, string rootTableName = null)
    {
        if (rootType == null) throw new ArgumentNullException(nameof(rootType));

        var tables = new List<NetSuiteModelClassTable>();
        var mainTable = new NetSuiteModelClassTable
        {
            TableName = rootTableName ?? rootType.Name
        };

        // Ensure we have a primary key on the main table. Most SuiteTalk records have "internalId".
        var internalIdProp = FindPropertyIgnoreCase(rootType, "internalId");
        if (internalIdProp != null)
        {
            // We will include internalId as NVARCHAR(50) and mark as PK
            AddOrEnsureColumn(mainTable, "internalId", "NVARCHAR(50)", isNullable: false);
            mainTable.PrimaryKeyColumn = "internalId";
        }
        else
        {
            // Fallback to a synthetic PK if the record somehow lacks it (unlikely)
            AddOrEnsureColumn(mainTable, $"{mainTable.TableName}Id", "NVARCHAR(50)", isNullable: false);
            mainTable.PrimaryKeyColumn = $"{mainTable.TableName}Id";
        }

        // Add other properties
        foreach (var prop in rootType.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            AddPropertyToTables(prop, mainTable, tables);
        }

        // add main table last to keep order (optional)
        tables.Insert(0, mainTable);
        return tables;
    }

    #region Property handlers

    private static void AddPropertyToTables(PropertyInfo prop, NetSuiteModelClassTable currentTable, List<NetSuiteModelClassTable> allTables)
    {
        // Skip serializer helper flags from WSDL
        if (prop.Name.EndsWith("Specified", StringComparison.Ordinal))
            return;

        // Skip duplicate internalId — we already ensured it
        if (prop.Name.Equals("internalId", StringComparison.OrdinalIgnoreCase))
            return;

        var type = prop.PropertyType;

        // 1) Simple scalars
        var scalarSql = MapClrTypeToSql(type);
        if (scalarSql != null)
        {
            currentTable.Columns.Add(new NetSuiteModelClassTableColumn
            {
                ColumnName = prop.Name,
                ColumnType = scalarSql
            });
            return;
        }

        // 2) RecordRef → flattened
        if (IsTypeNamed(type, "RecordRef"))
        {
            AddRecordRefColumns(prop, currentTable);
            return;
        }

        // 3) *List wrapper → child table(s)
        if (prop.Name.EndsWith("List", StringComparison.Ordinal))
        {
            TryAddListWrapperAsChildTables(prop, currentTable, allTables);
            return;
        }

        // 4) Everything else complex → skip for now (Address/CustomFieldList can be added later)
        // If you want to log skipped properties, do it here.
    }

    private static void AddRecordRefColumns(PropertyInfo prop, NetSuiteModelClassTable table)
    {
        // You asked to drive off an array of property names and loop
        // We'll reflect on the actual RecordRef type too, but keep a stable list.
        string[] rrProps = { "InternalId", "Name", "Type" }; // "Name" may be "name"/"Value" in some WSDLs

        foreach (var rr in rrProps)
        {
            table.Columns.Add(new NetSuiteModelClassTableColumn
            {
                ColumnName = $"{prop.Name}_rf_{rr}",
                ColumnType = MapRecordRefPropertyToSqlType(rr)
            });
        }
    }

    private static void TryAddListWrapperAsChildTables(PropertyInfo listWrapperProp, NetSuiteModelClassTable parentTable, List<NetSuiteModelClassTable> allTables)
    {
        var wrapperType = listWrapperProp.PropertyType;

        // common pattern: wrapper has a single array property (e.g., "item")
        var arrayProp = wrapperType
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(p => p.PropertyType.IsArray);

        if (arrayProp == null) return;

        var elementType = arrayProp.PropertyType.GetElementType();
        if (elementType == null) return;

        // Child table name convention: ParentTable_PropertyName
        var childTable = new NetSuiteModelClassTable
        {
            TableName = $"{parentTable.TableName}_{listWrapperProp.Name}",
            ParentTableName = parentTable.TableName,
            ParentPkColumn = parentTable.PrimaryKeyColumn
        };

        // FK column convention: ParentTableName_InternalId (or parent PK name)
        var fkName = $"{parentTable.TableName}_{parentTable.PrimaryKeyColumn}";
        childTable.ForeignKeyColumn = fkName;

        AddOrEnsureColumn(childTable, fkName, "NVARCHAR(50)", isNullable: false);

        // Most list elements in SuiteTalk do not have their own internalId; we create a synthetic PK for the child table
        childTable.PrimaryKeyColumn = $"{childTable.TableName}Id";
        AddOrEnsureColumn(childTable, childTable.PrimaryKeyColumn, "BIGINT", isNullable: false); // Identity-like PK (you can make it IDENTITY in SQL generator)

        // Now reflect properties of the element (e.g., InvoiceItem)
        foreach (var elemProp in elementType.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            // Reuse the same rules (scalar, RecordRef, nested lists are rare inside list elements — typically skipped)
            if (elemProp.Name.EndsWith("Specified", StringComparison.Ordinal))
                continue;

            var sql = MapClrTypeToSql(elemProp.PropertyType);
            if (sql != null)
            {
                childTable.Columns.Add(new NetSuiteModelClassTableColumn
                {
                    ColumnName = elemProp.Name,
                    ColumnType = sql
                });
                continue;
            }

            if (IsTypeNamed(elemProp.PropertyType, "RecordRef"))
            {
                AddRecordRefColumns(elemProp, childTable);
                continue;
            }

            // Skip other complex types for now (Address/CustomFieldList can be layered in later)
        }

        allTables.Add(childTable);
    }

    #endregion

    #region Helpers & mapping

    private static PropertyInfo FindPropertyIgnoreCase(Type type, string name)
        => type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
               .FirstOrDefault(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

    private static void AddOrEnsureColumn(NetSuiteModelClassTable table, string name, string sqlType, bool isNullable)
    {
        var existing = table.Columns.FirstOrDefault(c => c.ColumnName.Equals(name, StringComparison.OrdinalIgnoreCase));
        if (existing != null)
        {
            existing.ColumnType = sqlType;
            existing.IsNullable = isNullable;
            return;
        }

        table.Columns.Add(new NetSuiteModelClassTableColumn
        {
            ColumnName = name,
            ColumnType = sqlType,
            IsNullable = isNullable
        });
    }

    private static bool IsTypeNamed(Type t, string typeName)
        => string.Equals(t.Name, typeName, StringComparison.Ordinal)
           || string.Equals(t.FullName?.Split('.').LastOrDefault(), typeName, StringComparison.Ordinal);

    private static string MapRecordRefPropertyToSqlType(string propertyName)
    {
        switch (propertyName)
        {
            case "InternalId": return "NVARCHAR(50)";
            case "Name":       return "NVARCHAR(MAX)"; // aka Value/display name
            case "Type":       return "NVARCHAR(50)";  // enum label stored as text
            default:           return "NVARCHAR(MAX)";
        }
    }

    private static string MapClrTypeToSql(Type type)
    {
        if (type == typeof(string) || type == typeof(char) || type == typeof(char?)) return "NVARCHAR(MAX)";
        if (type == typeof(int) || type == typeof(int?)) return "INT";
        if (type == typeof(long) || type == typeof(long?)) return "BIGINT";
        if (type == typeof(short) || type == typeof(short?)) return "SMALLINT";
        if (type == typeof(byte) || type == typeof(byte?)) return "TINYINT";
        if (type == typeof(bool) || type == typeof(bool?)) return "BIT";
        if (type == typeof(DateTime) || type == typeof(DateTime?)) return "DATETIME";
        if (type == typeof(decimal) || type == typeof(decimal?)) return "DECIMAL(18, 6)";
        if (type == typeof(double) || type == typeof(double?)) return "DECIMAL(18, 6)";
        if (type == typeof(float) || type == typeof(float?)) return "REAL";

        // Enums → store text for readability (or INT if you prefer)
        if (type.IsEnum) return "NVARCHAR(50)";
        if (Nullable.GetUnderlyingType(type)?.IsEnum == true) return "NVARCHAR(50)";

        // Arrays, lists, and complex classes are not scalar
        if (type.IsArray) return null;
        if (type.IsClass && type != typeof(string)) return null;

        return null;
    }

    #endregion

    #region SQL generation

    /// <summary>
    /// Generate CREATE TABLE SQL for a single table (no FK).
    /// </summary>
    public static string GenerateCreateTableSql(NetSuiteModelClassTable table)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"CREATE TABLE [{table.TableName}] (");

        for (int i = 0; i < table.Columns.Count; i++)
        {
            var col = table.Columns[i];
            var nullable = col.IsNullable ? " NULL" : " NOT NULL";
            var comma = (i < table.Columns.Count - 1 || !string.IsNullOrEmpty(table.PrimaryKeyColumn)) ? "," : "";
            sb.AppendLine($"    [{col.ColumnName}] {col.ColumnType}{nullable}{comma}");
        }

        // Primary key
        if (!string.IsNullOrEmpty(table.PrimaryKeyColumn))
        {
            sb.AppendLine($"    ,CONSTRAINT [PK_{table.TableName}] PRIMARY KEY ([{table.PrimaryKeyColumn}])");
        }

        sb.AppendLine(");");
        return sb.ToString();
    }

    /// <summary>
    /// Generate CREATE TABLE SQL including FK where applicable.
    /// If a table has ParentTableName/ParentPkColumn/ForeignKeyColumn set, a FK will be added.
    /// </summary>
    public static string GenerateCreateTableSqlWithFk(NetSuiteModelClassTable table)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"CREATE TABLE [{table.TableName}] (");

        for (int i = 0; i < table.Columns.Count; i++)
        {
            var col = table.Columns[i];
            var nullable = col.IsNullable ? " NULL" : " NOT NULL";
            var comma = (i < table.Columns.Count - 1 || !string.IsNullOrEmpty(table.PrimaryKeyColumn) || HasFk(table)) ? "," : "";
            sb.AppendLine($"    [{col.ColumnName}] {col.ColumnType}{nullable}{comma}");
        }

        if (!string.IsNullOrEmpty(table.PrimaryKeyColumn))
        {
            sb.AppendLine($"    ,CONSTRAINT [PK_{table.TableName}] PRIMARY KEY ([{table.PrimaryKeyColumn}])");
        }

        if (HasFk(table))
        {
            sb.AppendLine($"    ,CONSTRAINT [FK_{table.TableName}_{table.ParentTableName}] " +
                          $"FOREIGN KEY ([{table.ForeignKeyColumn}]) " +
                          $"REFERENCES [{table.ParentTableName}]([{table.ParentPkColumn}])");
        }

        sb.AppendLine(");");
        return sb.ToString();
    }

    private static bool HasFk(NetSuiteModelClassTable t)
        => !string.IsNullOrEmpty(t.ParentTableName)
           && !string.IsNullOrEmpty(t.ParentPkColumn)
           && !string.IsNullOrEmpty(t.ForeignKeyColumn);

    /// <summary>
    /// Generate all CREATE TABLE scripts (parents before children) as a single SQL batch.
    /// </summary>
    public static string GenerateAllCreateTablesSql(List<NetSuiteModelClassTable> tables)
    {
        var sb = new StringBuilder();
        foreach (var t in tables)
        {
            sb.AppendLine(GenerateCreateTableSqlWithFk(t));
            sb.AppendLine();
        }
        return sb.ToString();
    }

    #endregion

    public static string GenerateAllCreateTablesSqlFile(List<NetSuiteModelClassTable> tables, string outputFolder)
    {
        if (!Directory.Exists(outputFolder))
        {
            Directory.CreateDirectory(outputFolder);
        }
    
        var sb = new StringBuilder();
    
        foreach (var table in tables)
        {
            var sql = GenerateCreateTableSqlWithFk(table);
    
            // Append to combined string
            sb.AppendLine(sql);
            sb.AppendLine();
    
            // Write to file
            var filePath = Path.Combine(outputFolder, $"{table.TableName}.sql");
            File.WriteAllText(filePath, sql);
        }
    
        return sb.ToString();
    }

}




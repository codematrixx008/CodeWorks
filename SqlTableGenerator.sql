using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;

public class SqlTableGenerator
{
    private readonly HashSet<string> _skipFields;
    private readonly Dictionary<string, string> _overrides;

    public SqlTableGenerator(IEnumerable<string> skipFields = null, Dictionary<string, string> propertyTypeOverrides = null)
    {
        // Default skip list with "FullName"
        _skipFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "FullName"
        };

        // Add user-specified skips if provided
        if (skipFields != null)
        {
            foreach (var field in skipFields)
                _skipFields.Add(field);
        }

        // Store overrides (can be null)
        _overrides = propertyTypeOverrides ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    public string GenerateCreateTableScript<T>(string tableName)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"CREATE TABLE [{tableName}] (");

        var props = typeof(T).GetProperties();
        var addedColumns = 0;
        var totalIncludedProps = props.Count(p => !_skipFields.Contains(p.Name));

        foreach (var prop in props)
        {
            var mapping = MapCSharpTypeToSqlType(prop.Name, prop.PropertyType);

            if (mapping.Skip)
                continue;

            sb.Append($"    [{prop.Name}] {mapping.SqlType}");

            // Set primary key if property name contains "Id"
            if (prop.Name.Equals("Id", StringComparison.OrdinalIgnoreCase) ||
                prop.Name.EndsWith("Id", StringComparison.OrdinalIgnoreCase))
            {
                sb.Append(" PRIMARY KEY");
            }

            addedColumns++;
            if (addedColumns < totalIncludedProps)
                sb.Append(",");

            sb.AppendLine();
        }

        sb.AppendLine(");");

        return sb.ToString();
    }

    private SqlColumnMapping MapCSharpTypeToSqlType(string propertyName, Type type)
    {
        // Skip if in skip list
        if (_skipFields.Contains(propertyName))
            return new SqlColumnMapping { Skip = true };

        // Check overrides
        if (_overrides.ContainsKey(propertyName))
            return new SqlColumnMapping { SqlType = _overrides[propertyName] };

        // If property name contains 'date' => DATETIME
        if (propertyName.IndexOf("date", StringComparison.OrdinalIgnoreCase) >= 0)
            return new SqlColumnMapping { SqlType = "DATETIME" };

        // Default type mapping
        if (type == typeof(int) || type == typeof(int?))
            return new SqlColumnMapping { SqlType = "INT" };
        if (type == typeof(string))
            return new SqlColumnMapping { SqlType = "NVARCHAR(255)" };
        if (type == typeof(DateTime) || type == typeof(DateTime?))
            return new SqlColumnMapping { SqlType = "DATETIME" };
        if (type == typeof(decimal) || type == typeof(decimal?))
            return new SqlColumnMapping { SqlType = "DECIMAL(18,2)" };
        if (type == typeof(bool) || type == typeof(bool?))
            return new SqlColumnMapping { SqlType = "BIT" };

        return new SqlColumnMapping { SqlType = "NVARCHAR(MAX)" }; // fallback
    }

    private class SqlColumnMapping
    {
        public bool Skip { get; set; }
        public string SqlType { get; set; }
    }
}


public class Employee
{
    public int EmployeeId { get; set; }         
    public string FirstName { get; set; }       
    public string LastName { get; set; }        
    public string Email { get; set; }           
    public string PhoneNumber { get; set; }     
    public string DateOfBirth { get; set; }     
    public string HireDate { get; set; }        
    public string Department { get; set; }      
    public decimal Salary { get; set; }         
    public string FullName { get; set; } // Default skipped
}

class Program
{
    static void Main()
    {
        // Example: Skip "Email" and override "Salary"
        var skipFields = new[] { "Email" };
        var overrides = new Dictionary<string, string>
        {
            { "Salary", "MONEY" }
        };

        var generator = new SqlTableGenerator(skipFields, overrides);
        string sql = generator.GenerateCreateTableScript<Employee>("Employees");

        Console.WriteLine(sql);
    }
}



CREATE TABLE [Employees] (
    [EmployeeId] INT PRIMARY KEY,
    [FirstName] NVARCHAR(255),
    [LastName] NVARCHAR(255),
    [PhoneNumber] NVARCHAR(255),
    [DateOfBirth] DATETIME,
    [HireDate] DATETIME,
    [Department] NVARCHAR(255),
    [Salary] MONEY
);

--------------------------------------------------------------------------------
public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

public class Employee
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; }
    public Address PermanentAddress { get; set; }
    public Address BillingAddress { get; set; }
}


using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;

public class SqlTableGenerator
{
    private readonly HashSet<string> _skipFields;
    private readonly Dictionary<string, string> _overrides;

    public SqlTableGenerator(IEnumerable<string> skipFields = null, Dictionary<string, string> propertyTypeOverrides = null)
    {
        _skipFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "FullName" };

        if (skipFields != null)
        {
            foreach (var field in skipFields)
                _skipFields.Add(field);
        }

        _overrides = propertyTypeOverrides ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    public string GenerateCreateTableScript<T>(string tableName)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"CREATE TABLE [{tableName}] (");

        var columns = GetColumns(typeof(T));

        for (int i = 0; i < columns.Count; i++)
        {
            var col = columns[i];
            sb.Append($"    [{col.Name}] {col.SqlType}");

            if (col.IsPrimaryKey)
                sb.Append(" PRIMARY KEY");

            if (i < columns.Count - 1)
                sb.Append(",");

            sb.AppendLine();
        }

        sb.AppendLine(");");
        return sb.ToString();
    }

    private List<SqlColumn> GetColumns(Type type, string prefix = "")
    {
        var result = new List<SqlColumn>();

        foreach (var prop in type.GetProperties())
        {
            if (_skipFields.Contains(prop.Name))
                continue;

            if (IsComplexType(prop.PropertyType))
            {
                // Recursively flatten nested object
                result.AddRange(GetColumns(prop.PropertyType, prefix + prop.Name + "_"));
            }
            else
            {
                var mapping = MapCSharpTypeToSqlType(prefix + prop.Name, prop.PropertyType, prop.Name);

                if (!mapping.Skip)
                {
                    result.Add(new SqlColumn
                    {
                        Name = prefix + prop.Name,
                        SqlType = mapping.SqlType,
                        IsPrimaryKey = prop.Name.Equals("Id", StringComparison.OrdinalIgnoreCase) ||
                                       prop.Name.EndsWith("Id", StringComparison.OrdinalIgnoreCase)
                    });
                }
            }
        }

        return result;
    }

    private bool IsComplexType(Type type)
    {
        return type.IsClass && type != typeof(string) && !type.IsArray;
    }

    private SqlColumnMapping MapCSharpTypeToSqlType(string columnName, Type type, string originalPropName)
    {
        if (_overrides.ContainsKey(originalPropName))
            return new SqlColumnMapping { SqlType = _overrides[originalPropName] };

        if (columnName.IndexOf("date", StringComparison.OrdinalIgnoreCase) >= 0)
            return new SqlColumnMapping { SqlType = "DATETIME" };

        if (type == typeof(int) || type == typeof(int?))
            return new SqlColumnMapping { SqlType = "INT" };
        if (type == typeof(string))
            return new SqlColumnMapping { SqlType = "NVARCHAR(255)" };
        if (type == typeof(DateTime) || type == typeof(DateTime?))
            return new SqlColumnMapping { SqlType = "DATETIME" };
        if (type == typeof(decimal) || type == typeof(decimal?))
            return new SqlColumnMapping { SqlType = "DECIMAL(18,2)" };
        if (type == typeof(bool) || type == typeof(bool?))
            return new SqlColumnMapping { SqlType = "BIT" };

        return new SqlColumnMapping { SqlType = "NVARCHAR(MAX)" };
    }

    private class SqlColumnMapping
    {
        public bool Skip { get; set; }
        public string SqlType { get; set; }
    }

    private class SqlColumn
    {
        public string Name { get; set; }
        public string SqlType { get; set; }
        public bool IsPrimaryKey { get; set; }
    }
}





public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

public class Employee
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; }
    public Address PermanentAddress { get; set; }
    public Address BillingAddress { get; set; }
}



class Program
{
    static void Main()
    {
        var generator = new SqlTableGenerator();
        string sql = generator.GenerateCreateTableScript<Employee>("Employees");
        Console.WriteLine(sql);
    }
}



CREATE TABLE [Employees] (
    [EmployeeId] INT PRIMARY KEY,
    [FirstName] NVARCHAR(255),
    [PermanentAddress_Street] NVARCHAR(255),
    [PermanentAddress_City] NVARCHAR(255),
    [PermanentAddress_ZipCode] NVARCHAR(255),
    [BillingAddress_Street] NVARCHAR(255),
    [BillingAddress_City] NVARCHAR(255),
    [BillingAddress_ZipCode] NVARCHAR(255)
);


---------------------------------------------------------------------------



using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;

public class SqlTableGenerator
{
    private readonly HashSet<string> _skipFields;
    private readonly Dictionary<string, string> _overrides;

    public SqlTableGenerator(IEnumerable<string> skipFields = null, Dictionary<string, string> propertyTypeOverrides = null)
    {
        // Default skip list
        _skipFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "FullName" };

        if (skipFields != null)
        {
            foreach (var field in skipFields)
                _skipFields.Add(field);
        }

        _overrides = propertyTypeOverrides ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    public string GenerateCreateTableScript<T>(string tableName)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"CREATE TABLE [{tableName}] (");

        var columns = GetColumns(typeof(T));

        for (int i = 0; i < columns.Count; i++)
        {
            var col = columns[i];
            sb.Append($"    [{col.Name}] {col.SqlType}");

            if (col.IsPrimaryKey)
                sb.Append(" PRIMARY KEY");

            if (i < columns.Count - 1)
                sb.Append(",");

            sb.AppendLine();
        }

        sb.AppendLine(");");
        return sb.ToString();
    }

    private List<SqlColumn> GetColumns(Type type, string prefix = "")
    {
        var result = new List<SqlColumn>();

        foreach (var prop in type.GetProperties())
        {
            string fullPath = (prefix + prop.Name).Trim('.');

            if (ShouldSkip(fullPath, prop.Name))
                continue;

            if (IsComplexType(prop.PropertyType))
            {
                // Flatten nested object
                result.AddRange(GetColumns(prop.PropertyType, prefix + prop.Name + "_"));
            }
            else
            {
                var mapping = MapCSharpTypeToSqlType(fullPath, prop.PropertyType);

                if (!mapping.Skip)
                {
                    result.Add(new SqlColumn
                    {
                        Name = prefix + prop.Name,
                        SqlType = mapping.SqlType,
                        IsPrimaryKey = prop.Name.Equals("Id", StringComparison.OrdinalIgnoreCase) ||
                                       prop.Name.EndsWith("Id", StringComparison.OrdinalIgnoreCase)
                    });
                }
            }
        }

        return result;
    }

    private bool IsComplexType(Type type)
    {
        return type.IsClass && type != typeof(string) && !type.IsArray;
    }

    private bool ShouldSkip(string fullPath, string simpleName)
    {
        return _skipFields.Contains(fullPath) || _skipFields.Contains(simpleName);
    }

    private SqlColumnMapping MapCSharpTypeToSqlType(string fullPath, Type type)
    {
        // Check overrides for full path first, then simple name
        if (_overrides.ContainsKey(fullPath))
            return new SqlColumnMapping { SqlType = _overrides[fullPath] };

        string simpleName = fullPath.Split('_').Last();
        if (_overrides.ContainsKey(simpleName))
            return new SqlColumnMapping { SqlType = _overrides[simpleName] };

        // Date keyword check
        if (fullPath.IndexOf("date", StringComparison.OrdinalIgnoreCase) >= 0)
            return new SqlColumnMapping { SqlType = "DATETIME" };

        // Default mappings
        if (type == typeof(int) || type == typeof(int?))
            return new SqlColumnMapping { SqlType = "INT" };
        if (type == typeof(string))
            return new SqlColumnMapping { SqlType = "NVARCHAR(255)" };
        if (type == typeof(DateTime) || type == typeof(DateTime?))
            return new SqlColumnMapping { SqlType = "DATETIME" };
        if (type == typeof(decimal) || type == typeof(decimal?))
            return new SqlColumnMapping { SqlType = "DECIMAL(18,2)" };
        if (type == typeof(bool) || type == typeof(bool?))
            return new SqlColumnMapping { SqlType = "BIT" };

        return new SqlColumnMapping { SqlType = "NVARCHAR(MAX)" };
    }

    private class SqlColumnMapping
    {
        public bool Skip { get; set; }
        public string SqlType { get; set; }
    }

    private class SqlColumn
    {
        public string Name { get; set; }
        public string SqlType { get; set; }
        public bool IsPrimaryKey { get; set; }
    }
}



public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

public class Employee
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; }
    public Address PermanentAddress { get; set; }
    public Address BillingAddress { get; set; }
    public string FullName { get; set; } // Skipped by default
}


class Program
{
    static void Main()
    {
        var skipFields = new[]
        {
            "BillingAddress.ZipCode", // skip nested property
            "PermanentAddress.City"   // skip nested property
        };

        var overrides = new Dictionary<string, string>
        {
            { "PermanentAddress.ZipCode", "NVARCHAR(10)" },
            { "BillingAddress.City", "NVARCHAR(150)" }
        };

        var generator = new SqlTableGenerator(skipFields, overrides);
        string sql = generator.GenerateCreateTableScript<Employee>("Employees");

        Console.WriteLine(sql);
    }
}

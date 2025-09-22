import React, { useEffect, useState } from "react";

type RangeKey =
    | "custom"
    | "today"
    | "yesterday"
    | "tomorrow"
    | "last_2_days"
    | "last_3_days"
    | "last_5_days"
    | "last_7_days"
    | "last_14_days"
    | "this_week"
    | "last_week"
    | "next_week"
    | "last_2_weeks"
    | "last_3_weeks"
    | "last_4_weeks"
    | "wtd"
    | "this_month"
    | "last_month"
    | "next_month"
    | "last_2_months"
    | "last_3_months"
    | "last_6_months"
    | "mtd"
    | "this_quarter"
    | "last_quarter"
    | "next_quarter"
    | "last_2_quarters"
    | "last_4_quarters"
    | "qtd"
    | "this_year"
    | "last_year"
    | "next_year"
    | "last_2_years"
    | "last_3_years"
    | "last_5_years"
    | "last_10_years"
    | "ytd";

export type DateRange = { from: string; to: string };

const predefinedRanges: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "last_2_days", label: "Last 2 Days" },
    { key: "last_3_days", label: "Last 3 Days" },
    { key: "last_5_days", label: "Last 5 Days" },
    { key: "last_7_days", label: "Last 7 Days" },
    { key: "last_14_days", label: "Last 14 Days" },
    { key: "this_week", label: "This Week" },
    { key: "last_week", label: "Last Week" },
    { key: "next_week", label: "Next Week" },
    { key: "last_2_weeks", label: "Last 2 Weeks" },
    { key: "last_3_weeks", label: "Last 3 Weeks" },
    { key: "last_4_weeks", label: "Last 4 Weeks" },
    { key: "wtd", label: "Week to Date (WTD)" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "next_month", label: "Next Month" },
    { key: "last_2_months", label: "Last 2 Months" },
    { key: "last_3_months", label: "Last 3 Months" },
    { key: "last_6_months", label: "Last 6 Months" },
    { key: "mtd", label: "Month to Date (MTD)" },
    { key: "this_quarter", label: "This Quarter" },
    { key: "last_quarter", label: "Last Quarter" },
    { key: "next_quarter", label: "Next Quarter" },
    { key: "last_2_quarters", label: "Last 2 Quarters" },
    { key: "last_4_quarters", label: "Last 4 Quarters" },
    { key: "qtd", label: "Quarter to Date (QTD)" },
    { key: "this_year", label: "This Year" },
    { key: "last_year", label: "Last Year" },
    { key: "next_year", label: "Next Year" },
    { key: "last_2_years", label: "Last 2 Years" },
    { key: "last_3_years", label: "Last 3 Years" },
    { key: "last_5_years", label: "Last 5 Years" },
    { key: "last_10_years", label: "Last 10 Years" },
    { key: "ytd", label: "Year to Date (YTD)" },
    { key: "custom", label: "Custom Date" },
];

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekSunday(d: Date) {
    const res = new Date(d);
    res.setDate(d.getDate() - d.getDay());
    return res;
}
function endOfWeekSaturday(d: Date) {
    const res = startOfWeekSunday(d);
    res.setDate(res.getDate() + 6);
    return res;
}
function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfQuarter(d: Date) {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
}
function endOfQuarter(d: Date) {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
}
function startOfYear(d: Date) {
    return new Date(d.getFullYear(), 0, 1);
}
function endOfYear(d: Date) {
    return new Date(d.getFullYear(), 11, 31);
}

function computeRangeForKey(key: RangeKey): DateRange {
    const now = new Date();
    switch (key) {
        case "today":
            return { from: toISODate(now), to: toISODate(now) };
        case "yesterday": {
            const y = new Date(now);
            y.setDate(now.getDate() - 1);
            return { from: toISODate(y), to: toISODate(y) };
        }
        case "tomorrow": {
            const t = new Date(now);
            t.setDate(now.getDate() + 1);
            return { from: toISODate(t), to: toISODate(t) };
        }
        case "last_2_days": {
            const s = new Date(now);
            s.setDate(now.getDate() - 1);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_3_days": {
            const s = new Date(now);
            s.setDate(now.getDate() - 2);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_5_days": {
            const s = new Date(now);
            s.setDate(now.getDate() - 4);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_7_days": {
            const s = new Date(now);
            s.setDate(now.getDate() - 6);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_14_days": {
            const s = new Date(now);
            s.setDate(now.getDate() - 13);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "this_week": {
            const s = startOfWeekSunday(now);
            const e = endOfWeekSaturday(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_week": {
            const s = startOfWeekSunday(now);
            s.setDate(s.getDate() - 7);
            const e = new Date(s);
            e.setDate(s.getDate() + 6);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "next_week": {
            const s = startOfWeekSunday(now);
            s.setDate(s.getDate() + 7);
            const e = new Date(s);
            e.setDate(s.getDate() + 6);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_2_weeks": {
            const s = startOfWeekSunday(now);
            s.setDate(s.getDate() - 14);
            const e = new Date(s);
            e.setDate(s.getDate() + 13);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_3_weeks": {
            const s = startOfWeekSunday(now);
            s.setDate(s.getDate() - 21);
            const e = new Date(s);
            e.setDate(s.getDate() + 20);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_4_weeks": {
            const s = startOfWeekSunday(now);
            s.setDate(s.getDate() - 28);
            const e = new Date(s);
            e.setDate(s.getDate() + 27);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "wtd": {
            const s = startOfWeekSunday(now);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "this_month": {
            const s = startOfMonth(now);
            const e = endOfMonth(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_month": {
            const firstDayThisMonth = startOfMonth(now);
            const lastMonth = new Date(firstDayThisMonth);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const s = startOfMonth(lastMonth);
            const e = endOfMonth(lastMonth);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "next_month": {
            const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const s = startOfMonth(firstDayNextMonth);
            const e = endOfMonth(firstDayNextMonth);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_2_months": {
            const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
            const e = endOfMonth(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_3_months": {
            const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
            const e = endOfMonth(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_6_months": {
            const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
            const e = endOfMonth(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "mtd": {
            const s = startOfMonth(now);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "this_quarter": {
            const s = startOfQuarter(now);
            const e = endOfQuarter(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_quarter": {
            const q = Math.floor(now.getMonth() / 3);
            const year = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
            const month = q === 0 ? 9 : (q - 1) * 3;
            const s = new Date(year, month, 1);
            const e = new Date(year, month + 3, 0);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "next_quarter": {
            const q = Math.floor(now.getMonth() / 3);
            const year = q === 3 ? now.getFullYear() + 1 : now.getFullYear();
            const month = ((q + 1) % 4) * 3;
            const s = new Date(year, month, 1);
            const e = new Date(year, month + 3, 0);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_2_quarters": {
            const q = Math.floor(now.getMonth() / 3);
            const year = q <= 1 ? now.getFullYear() - 1 : now.getFullYear();
            const month = q <= 1 ? 6 : (q - 2) * 3;
            const s = new Date(year, month, 1);
            const e = endOfQuarter(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_4_quarters": {
            const q = Math.floor(now.getMonth() / 3);
            const year = q <= 3 ? now.getFullYear() - 1 : now.getFullYear();
            const month = q <= 3 ? 0 : (q - 4) * 3;
            const s = new Date(year, month, 1);
            const e = endOfQuarter(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "qtd": {
            const s = startOfQuarter(now);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "this_year": {
            const s = startOfYear(now);
            const e = endOfYear(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_year": {
            const s = new Date(now.getFullYear() - 1, 0, 1);
            const e = new Date(now.getFullYear() - 1, 11, 31);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "next_year": {
            const s = new Date(now.getFullYear() + 1, 0, 1);
            const e = new Date(now.getFullYear() + 1, 11, 31);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "last_2_years": {
            const s = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_3_years": {
            const s = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_5_years": {
            const s = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "last_10_years": {
            const s = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "ytd": {
            const s = startOfYear(now);
            return { from: toISODate(s), to: toISODate(now) };
        }
        case "custom":
        default:
            return { from: toISODate(now), to: toISODate(now) };
    }
}

export interface DateRangePickerProps {
    value?: DateRange;
    defaultValue?: DateRange;
    onChange?: (range: DateRange) => void;
    initialRangeKey?: RangeKey;
}

export const DateRangeCopy: React.FC<DateRangePickerProps> = ({
    value,
    defaultValue,
    onChange,
    initialRangeKey = "today",
}) => {
    const isControlled = value !== undefined;
    const initial = defaultValue ?? computeRangeForKey(initialRangeKey);

    const [internalRange, setInternalRange] = useState<DateRange>(initial);
    const [selectedKey, setSelectedKey] = useState<RangeKey>(initialRangeKey);

    useEffect(() => {
        if (isControlled && value) {
            setInternalRange(value);
            const matched = predefinedRanges.find((r) => {
                const pr = computeRangeForKey(r.key);
                return pr.from === value.from && pr.to === value.to;
            });
            if (matched) {
                setSelectedKey(matched.key);
            } else {
                setSelectedKey("custom");
            }
        }
    }, [value]);

    const updateRange = (next: DateRange, key?: RangeKey) => {
        if (!isControlled) setInternalRange(next);
        if (key) setSelectedKey(key);
        onChange?.(next);
        console.log("Selected Range:", next.from, "to", next.to);
    };

    const handleRangeKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const key = e.target.value as RangeKey;
        setSelectedKey(key);
        const computed = computeRangeForKey(key);
        updateRange(computed, key);
    };

    const onFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = { from: e.target.value, to: (isControlled ? value : internalRange).to };
        setInternalRange(next);
        setSelectedKey("custom");
        onChange?.(next);
    };

    const onToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = { from: (isControlled ? value : internalRange).from, to: e.target.value };
        setInternalRange(next);
        setSelectedKey("custom");
        onChange?.(next);
    };

    const current = isControlled && value ? value : internalRange;

    return (
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, maxWidth: 400 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <label style={{ minWidth: 60 }}>Range</label>
                <select
                    value={selectedKey}
                    onChange={handleRangeKeyChange}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                >
                    {predefinedRanges.map((r) => (
                        <option key={r.key} value={r.key}>
                            {r.label}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 12, alignItems: "center" }}>
                <label>From</label>
                <input type="date" value={current.from} onChange={onFromChange} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />

                <label>To</label>
                <input type="date" value={current.to} onChange={onToChange} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
            </div>
        </div>
    );
};
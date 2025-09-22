import React, { useEffect, useState } from "react";

type RangeKey = "custom" | "today" | "yesterday" | "this_week" | "this_month";
export type DateRange = { from: string; to: string };

const predefinedRanges: { key: RangeKey; label: string }[] = [
    { key: "custom", label: "Custom date" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This week" },
    { key: "this_month", label: "This month" },
];

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// week start from sunday 
function startOfWeekSunday(d: Date) {
    const res = new Date(d);
    res.setDate(d.getDate() - d.getDay());
    return res;
}

// week end on saturday
function endOfWeekSaturday(d: Date) {
    const res = startOfWeekSunday(d);
    res.setDate(res.getDate() + 6);
    return res;
}


// start of month
function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

// end of month
function endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
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
        case "this_week": { 
            const s = startOfWeekSunday(now);
            const e = endOfWeekSaturday(now);
            return { from: toISODate(s), to: toISODate(e) };
        }
        case "this_month": {
            const s = startOfMonth(now);
            const e = endOfMonth(now);
            return { from: toISODate(s), to: toISODate(e) };
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

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    value,
    defaultValue,
    onChange,
    initialRangeKey = "custom",
}) => {
    const isControlled = value !== undefined;
    const initial = defaultValue ?? computeRangeForKey(initialRangeKey);

    const [internalRange, setInternalRange] = useState<DateRange>(initial);
    const [selectedKey, setSelectedKey] = useState<RangeKey>(initialRangeKey);

    useEffect(() => {
        if (isControlled && value) {
            setInternalRange(value);

            // If value matches a predefined range, update key
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
        console.log("Selected Range:", next.from, "to", next.to); //

    };

    // dropdown change
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

    // currnet range
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
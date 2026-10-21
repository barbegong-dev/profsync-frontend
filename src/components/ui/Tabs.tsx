import React from 'react';

export interface TabItem<T extends string> {
    value: T;
    label: string;
    count?: number;
    /** Colour of the active pill */
    tone?: 'default' | 'warning' | 'success' | 'danger';
}

interface TabsProps<T extends string> {
    tabs: TabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    label?: string;
}

/** shadcn-style segmented tabs on glass. Scrolls sideways on narrow screens. */
export default function Tabs<T extends string>({ tabs, value, onChange, label = 'Filter' }: TabsProps<T>) {
    return (
        <div className="tabs" role="tablist" aria-label={label}>
            {tabs.map(tab => (
                <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={tab.value === value}
                    className={`tab tab-${tab.tone ?? 'default'}`}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                    {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
                </button>
            ))}
        </div>
    );
}

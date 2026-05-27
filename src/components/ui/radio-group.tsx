"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value: string;
  onChange: (v: string) => void;
  name: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onValueChange: (v: string) => void;
  name?: string;
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({
  value,
  onValueChange,
  name,
  className,
  children,
}: RadioGroupProps) {
  const generatedName = React.useId();
  return (
    <RadioGroupContext.Provider
      value={{ value, onChange: onValueChange, name: name ?? generatedName }}
    >
      <div className={cn("grid gap-2", className)} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function RadioItem({
  value,
  id,
  disabled,
  className,
  children,
}: RadioItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioItem must be inside RadioGroup");
  const checked = ctx.value === value;
  const inputId = id ?? `${ctx.name}-${value}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border border-input p-3 transition-colors",
        checked && "border-primary bg-primary/5 ring-1 ring-primary",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        type="radio"
        id={inputId}
        name={ctx.name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => ctx.onChange(value)}
        className="h-4 w-4 accent-primary"
      />
      <div className="flex-1 text-sm">{children}</div>
    </label>
  );
}

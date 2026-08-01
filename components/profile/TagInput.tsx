"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
};

export function TagInput({ id, label, placeholder, values, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addTag(): void {
    const value = draft.trim();

    if (value.length === 0) {
      return;
    }

    const isDuplicate = values.some(
      (existing) => existing.toLowerCase() === value.toLowerCase(),
    );

    if (!isDuplicate) {
      onChange([...values, value]);
    }

    setDraft("");
  }

  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter inside a form submits it — here it means "add this tag".
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={addTag}
          className="h-10 shrink-0 bg-surface-secondary hover:bg-border-light"
        >
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary"
            >
              {value}
              <button
                type="button"
                onClick={() =>
                  onChange(values.filter((existing) => existing !== value))
                }
                className="text-text-muted transition-colors hover:text-text-primary focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
              >
                <X aria-hidden className="size-3.5" />
                <span className="sr-only">Remove {value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}

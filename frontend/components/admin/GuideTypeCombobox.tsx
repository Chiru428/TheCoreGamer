"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then(r => r.json());

interface GuideTypeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function GuideTypeCombobox({ value, onChange, disabled }: GuideTypeComboboxProps) {
  const { data } = useSWR("/api/admin/guide-types", fetcher);
  const existingTypes = Array.isArray(data?.data) ? data.data : ["General Guide", "Walkthrough", "Mod Guide"];

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allTypes = Array.from(new Set([...existingTypes, "General Guide", "Walkthrough", "Mod Guide"]));
  const filteredTypes = allTypes.filter(t => t.toLowerCase().includes(inputValue.toLowerCase()));

  const exactMatch = filteredTypes.some(t => t.toLowerCase() === inputValue.trim().toLowerCase());
  const showCreateOption = inputValue.trim() !== "" && !exactMatch;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="e.g. Walkthrough"
          className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent pr-10 disabled:opacity-50"
          autoComplete="off"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {filteredTypes.map(type => (
            <button
              key={type}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated transition-colors"
              onClick={() => {
                setInputValue(type);
                onChange(type);
                setIsOpen(false);
              }}
            >
              {type}
            </button>
          ))}
          
          {showCreateOption && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-accent font-medium hover:bg-bg-elevated transition-colors flex items-center gap-2"
              onClick={() => {
                onChange(inputValue.trim());
                setIsOpen(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Create "{inputValue.trim()}"
            </button>
          )}

          {filteredTypes.length === 0 && !showCreateOption && (
            <div className="px-3 py-3 text-sm text-text-muted text-center italic">
              No matching types
            </div>
          )}
        </div>
      )}
    </div>
  );
}

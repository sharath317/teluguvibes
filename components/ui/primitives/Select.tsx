'use client';

/**
 * Select Primitive Component
 * 
 * An accessible dropdown select with search and multi-select support.
 * Uses design tokens for consistent styling across themes.
 * 
 * @example
 * // Basic select
 * <Select 
 *   label="Country" 
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' },
 *   ]}
 * />
 * 
 * // Multi-select
 * <Select 
 *   label="Categories" 
 *   multiple 
 *   options={categories} 
 *   value={selected}
 *   onChange={setSelected}
 * />
 */

import { 
  forwardRef, 
  useState, 
  useRef, 
  useEffect, 
  useId,
  ReactNode,
  KeyboardEvent
} from 'react';

// ============================================================
// TYPES
// ============================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
  /** Select label */
  label?: string;
  /** Options to display */
  options: SelectOption[];
  /** Selected value(s) */
  value?: string | string[];
  /** Called when selection changes */
  onChange?: (value: string | string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Enable multi-select */
  multiple?: boolean;
  /** Enable search */
  searchable?: boolean;
  /** Helper text */
  helper?: string;
  /** Error message */
  error?: string;
  /** Size preset */
  size?: SelectSize;
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// STYLES
// ============================================================

const labelStyles = `
  block text-sm font-medium text-[var(--text-primary)] mb-1.5
`.replace(/\s+/g, ' ').trim();

const triggerStyles = `
  w-full
  flex items-center justify-between gap-2
  bg-[var(--bg-secondary)]
  text-[var(--text-primary)]
  border border-[var(--border-primary)]
  rounded-[var(--radius-md)]
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]
  disabled:opacity-50 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
};

const dropdownStyles = `
  absolute z-50 w-full mt-1
  bg-[var(--bg-card)]
  border border-[var(--border-primary)]
  rounded-[var(--radius-md)]
  shadow-[var(--shadow-lg)]
  max-h-60 overflow-auto
  animate-in fade-in slide-in-from-top-2 duration-150
`.replace(/\s+/g, ' ').trim();

const optionStyles = `
  px-4 py-2 cursor-pointer
  text-[var(--text-primary)]
  hover:bg-[var(--bg-hover)]
  transition-colors
`.replace(/\s+/g, ' ').trim();

// ============================================================
// COMPONENT
// ============================================================

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (props, ref) => {
    const {
      label,
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      multiple = false,
      searchable = false,
      helper,
      error,
      size = 'md',
      disabled = false,
      fullWidth = true,
      className = '',
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    const generatedId = useId();
    const listboxId = `${generatedId}-listbox`;

    // Convert value to array for consistent handling
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    // Filter options based on search
    const filteredOptions = searchable
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(search.toLowerCase())
        )
      : options;

    // Get display text
    const displayText = selectedValues.length > 0
      ? multiple
        ? `${selectedValues.length} selected`
        : options.find(opt => opt.value === selectedValues[0])?.label
      : placeholder;

    // Handle option selection
    const handleSelect = (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter(v => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange?.(newValues);
      } else {
        onChange?.(optionValue);
        setIsOpen(false);
      }
      setSearch('');
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    return (
      <div 
        ref={containerRef} 
        className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {label && (
          <label className={labelStyles}>
            {label}
          </label>
        )}
        
        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`${triggerStyles} ${sizeStyles[size]} ${error ? 'border-[var(--error)]' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? generatedId : undefined}
        >
          <span className={selectedValues.length === 0 ? 'text-[var(--text-tertiary)]' : ''}>
            {displayText}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div 
            className={dropdownStyles}
            role="listbox"
            id={listboxId}
            aria-multiselectable={multiple}
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-[var(--border-primary)]">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>
            )}
            
            {/* Options */}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isFocused = index === focusedIndex;
                
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={`
                      ${optionStyles}
                      ${isSelected ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}
                      ${isFocused ? 'bg-[var(--bg-hover)]' : ''}
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {multiple && (
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--border-primary)]'}`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      )}
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Error/Helper */}
        {error && (
          <p className="text-xs mt-1.5 text-[var(--error)]" role="alert">
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="text-xs mt-1.5 text-[var(--text-tertiary)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;



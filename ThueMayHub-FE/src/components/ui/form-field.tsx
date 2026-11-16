import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";

const box = "mt-2 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium";

/**
 * Ô nhập có nhãn. `as="select"` là ô chọn, `as="textarea"` là ô nhiều dòng; cả hai
 * nhận `defaultValue`, `required`, `onChange` giống ô nhập thường để form sửa điền sẵn
 * được giá trị cũ.
 */
export function FormField({
  label,
  name,
  as,
  hint,
  children,
  ...rest
}: {
  label: string;
  name: string;
  as?: "select" | "textarea";
  hint?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const onChange = rest.onChange as unknown as ((e: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => void) | undefined;
  return (
    <label className="mb-3 block text-sm font-bold">
      {label}
      {as === "select" ? (
        <select
          name={name}
          className={`${box} h-11`}
          defaultValue={rest.defaultValue as string | undefined}
          required={rest.required}
          onChange={onChange}
        >
          {children}
        </select>
      ) : as === "textarea" ? (
        <textarea
          name={name}
          className={`${box} min-h-24 py-2.5`}
          defaultValue={rest.defaultValue as string | undefined}
          required={rest.required}
          minLength={rest.minLength}
          maxLength={rest.maxLength}
          placeholder={rest.placeholder}
          onChange={onChange}
        />
      ) : (
        <input name={name} className={`${box} h-11`} {...rest} />
      )}
      {hint && <span className="mt-1 block text-xs font-medium text-muted">{hint}</span>}
    </label>
  );
}

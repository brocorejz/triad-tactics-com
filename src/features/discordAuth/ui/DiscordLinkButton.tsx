import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type DiscordLinkButtonProps = {
	children?: ReactNode;
	variant?: 'primary' | 'outline';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function DiscordLinkButton({
	children,
	variant = 'primary',
	className,
	...props
}: DiscordLinkButtonProps) {
	const base =
		'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60';
	const variantClass =
		variant === 'outline'
			? 'border border-[#5865F2] bg-transparent text-[#5865F2] hover:bg-[#5865F2]/10'
			: 'bg-[#5865F2] text-white shadow-sm shadow-black/30 hover:opacity-90';

	return (
		<button
			type="button"
			className={`${base} ${variantClass}${className ? ` ${className}` : ''}`}
			{...props}>
			{children}
		</button>
	);
}

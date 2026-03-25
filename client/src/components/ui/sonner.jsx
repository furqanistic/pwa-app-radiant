import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group !z-[2147483647]"
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#111827",
          "--normal-border": "#e5e7eb",
          "--success-bg": "#ecfdf5",
          "--success-text": "#065f46",
          "--success-border": "#a7f3d0",
          "--error-bg": "#fef2f2",
          "--error-text": "#991b1b",
          "--error-border": "#fecaca",
          "--info-bg": "#eff6ff",
          "--info-text": "#1d4ed8",
          "--info-border": "#bfdbfe",
          "--warning-bg": "#fffbeb",
          "--warning-text": "#92400e",
          "--warning-border": "#fde68a",
          zIndex: 2147483647,
          position: "fixed",
        }
      }
      {...props} />)
  );
}

export { Toaster }

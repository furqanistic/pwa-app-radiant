import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--brand-primary)",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
          "--success-bg": "var(--brand-primary)",
          "--success-text": "#ffffff",
          "--success-border": "transparent",
          "--error-bg": "var(--brand-primary)",
          "--error-text": "#ffffff",
          "--error-border": "transparent",
          "--info-bg": "var(--brand-primary)",
          "--info-text": "#ffffff",
          "--info-border": "transparent",
          "--warning-bg": "var(--brand-primary)",
          "--warning-text": "#ffffff",
          "--warning-border": "transparent"
        }
      }
      {...props} />)
  );
}

export { Toaster }

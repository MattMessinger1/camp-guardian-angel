import * as React from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  children?: React.ReactNode
  className?: string
}

interface FooterProps {
  children?: React.ReactNode
  className?: string
}

interface LayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        {children}
      </header>
    )
  }
)
Header.displayName = "Header"

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          "w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        {children}
      </footer>
    )
  }
)
Footer.displayName = "Footer"

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ children, header, footer, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("min-h-screen flex flex-col", className)}
        {...props}
      >
        {header && <Header>{header}</Header>}
        
        <main className="flex-1">
          {children}
        </main>
        
        {footer && <Footer>{footer}</Footer>}
      </div>
    )
  }
)
Layout.displayName = "Layout"

export { Layout, Header, Footer }
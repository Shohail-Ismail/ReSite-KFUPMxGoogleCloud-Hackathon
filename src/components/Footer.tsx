import { Recycle, Mail, MapPin, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Recycle className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight">ReSite</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Circular economy platform for construction materials. Reducing waste, building sustainability.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:shohailusman@gmail.com"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group"
              >
                <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                resite@kfupm.edu.sa
              </a>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  King Fahd University of Petroleum & Minerals
                  <br />
                  Dhahran, Saudi Arabia
                </span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">About</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Built for the Google Cloud × KFUPM Intelligent Planet Hackathon</p>
              <p>Supporting Saudi Vision 2030 sustainability goals</p>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-foreground hover:text-primary transition-colors group"
              >
                Privacy Policy
                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ReSite Demo: Shohail Ismail,</p>
          <p>Chinmay Sharma, Ram Karakula, Shaurya Singh.</p>
        </div>
      </div>
    </footer>
  );
}

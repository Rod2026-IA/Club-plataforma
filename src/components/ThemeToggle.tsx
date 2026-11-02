import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return true;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Set initial theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDark(false);
    } else {
      setDark(true);
    }
  }, []);

  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        toast({
          title: next ? "Tema oscuro guardado" : "Tema claro guardado",
          description: "Tu preferencia se aplicará cada vez que inicies sesión.",
        });
      }}
      className="relative p-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card transition-all group"
      aria-label="Cambiar tema"
    >
      {dark ? (
        <Sun className="w-5 h-5 text-primary transition-transform group-hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-secondary transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const QUOTES = [
  "Hoy es un buen día para conquistar nuevas metas.",
  "Cada paso cuenta. ¡Sigue avanzando, conquistador!",
  "Tu fe mueve montañas, hoy también.",
  "El esfuerzo de hoy es la victoria de mañana.",
  "Sirve con alegría: ese es el verdadero ideal.",
  "Sé luz donde quiera que vayas.",
  "Pequeñas acciones diarias forjan grandes guías.",
  "Dios tiene algo grande preparado para ti hoy.",
  "Cree, persevera y conquista.",
  "Tu actitud define tu altitud.",
];

interface WelcomeEnvelopeProps {
  name: string;
  seed?: string;
  onClose: () => void;
}

const WelcomeEnvelope = ({ name, seed, onClose }: WelcomeEnvelopeProps) => {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  // 0: sobre cerrado, 1: solapa abierta, 2: papel afuera

  const quote = useMemo(() => {
    if (seed) {
      // Hash determinístico para que el mismo seed produzca la misma frase
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
      }
      return QUOTES[Math.abs(hash) % QUOTES.length];
    }
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, [seed]);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_rgba(30,64,175,0.95)_0%,_rgba(7,12,32,0.98)_70%)] backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Glow ambiente */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-400/20 blur-3xl" />
        </div>

        {/* Botón cerrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Escena del sobre */}
        <div
          className="relative w-[88vw] max-w-[380px] aspect-[4/5]"
          style={{ perspective: "1200px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Papel que sale del sobre */}
          <div
            className="absolute z-20 w-[72%] h-[60%]"
            style={{
              position: "absolute",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              maxHeight: "80vh",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ y: 0, opacity: 0, scale: 0.9 }}
              animate={
                stage === 2
                  ? { y: "-42%", opacity: 1, scale: 1 }
                  : stage === 1
                  ? { y: "-5%", opacity: 0.4, scale: 0.95 }
                  : { y: 0, opacity: 0, scale: 0.9 }
              }
              transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-full h-full rounded-xl bg-gradient-to-br from-white via-blue-50 to-cyan-50 shadow-[0_20px_60px_rgba(0,200,255,0.4)] px-3 py-4 sm:px-5 sm:py-5 flex flex-col items-center justify-center text-center border border-cyan-200 overflow-hidden"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 mb-1.5 shrink-0" />
              <h2 className="text-sm sm:text-xl font-extrabold text-slate-800 mb-1 leading-tight">
                ¡Bienvenido(a)!
              </h2>
              <p className="text-xs sm:text-base font-bold text-cyan-700 mb-1.5 sm:mb-2 break-words max-w-full leading-tight">
                {name}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-600 italic leading-snug break-words">
                "{quote}"
              </p>
            </motion.div>
          </div>

          {/* Cuerpo del sobre (parte trasera) */}
          <div className="absolute inset-0 z-10">
            {/* Fondo del sobre */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-blue-700 to-blue-900 shadow-[0_25px_60px_rgba(0,0,0,0.6)]" />

            {/* Triángulos laterales (frente del sobre) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: "polygon(0 0, 50% 50%, 100% 0, 100% 100%, 0 100%)",
                background:
                  "linear-gradient(180deg, hsl(220 70% 30%) 0%, hsl(222 75% 18%) 100%)",
              }}
            />

            {/* Bolsillo frontal del sobre (oculta el papel cuando baja) */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[60%] rounded-b-lg"
              style={{
                background:
                  "linear-gradient(180deg, hsl(222 75% 22%) 0%, hsl(222 80% 14%) 100%)",
                clipPath: "polygon(0 35%, 50% 0, 100% 35%, 100% 100%, 0 100%)",
                boxShadow: "inset 0 8px 20px rgba(0,0,0,0.4)",
              }}
            />

            {/* Solapa superior del sobre (se abre) */}
            <motion.div
              initial={{ rotateX: 0 }}
              animate={{ rotateX: stage >= 1 ? -180 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              style={{
                transformOrigin: "top",
                transformStyle: "preserve-3d",
                clipPath: "polygon(0 0, 50% 60%, 100% 0)",
                background:
                  "linear-gradient(180deg, hsl(220 70% 35%) 0%, hsl(222 70% 25%) 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              className="absolute top-0 left-0 right-0 h-[60%] rounded-t-lg"
            />
          </div>

          {/* Brillo decorativo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === 2 ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -20, opacity: [0, 1, 0] }}
                  transition={{
                    delay: 0.4 + i * 0.1,
                    duration: 1.2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: stage === 2 ? 1 : 0, y: stage === 2 ? 0 : 10 }}
          transition={{ delay: 0.6 }}
          onClick={onClose}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-cyan-400 text-slate-900 font-bold shadow-[0_8px_30px_rgba(34,211,238,0.6)] hover:bg-cyan-300 transition-colors"
        >
          Continuar
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeEnvelope;
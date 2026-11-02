export interface ShareOption {
  id: string;
  text: string;
}

export interface CompletionInfo {
  date: string;
  instructor: string;
}

export interface Requirement {
  id: string;
  text: string;
  completed: boolean;
  completionInfo?: CompletionInfo;
  hasShareOptions?: boolean;
  shareOptionsCount?: number;
  selectedShareOptions?: string[];
  subitems?: SubItem[];
}

export interface SubItem {
  id: string;
  text: string;
  completed: boolean;
  completionInfo?: CompletionInfo;
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string;
  requirements: Requirement[];
}

export const shareOptions: ShareOption[] = [
  { id: "sh1", text: "Escriba tres tarjetas inspiradoras y entrégueselas a un amigo que no asiste a la iglesia." },
  { id: "sh2", text: "Publique tres de sus citas favoritas (con un breve comentario) en las redes sociales o en un blog personal." },
  { id: "sh3", text: "Grabe un video o podcast que resuma tres ideas que aprendió y publíquelo en línea." },
  { id: "sh4", text: "Discuta con un grupo tres conceptos que puede aplicar al evangelismo." },
  { id: "sh5", text: "Presente un devocional a su club o grupo de jóvenes." },
  { id: "sh6", text: "Comparta de otra manera creativa aprobada por su Conferencia/Misión." },
];

function makeSubs(items: string[], prefix: string): SubItem[] {
  return items.map((text, i) => ({
    id: `${prefix}-sub${i + 1}`,
    text,
    completed: false,
  }));
}

export const initialSections: Section[] = [
  {
    id: "prereq",
    title: "Pre-Requisitos",
    requirements: [
      { id: "p1", text: "Ser miembro bautizado, en posición regular, de la Iglesia Adventista del Séptimo Día.", completed: false },
      { id: "p2", text: "Tener al menos 16 años para iniciar esta tarjeta y 18 años para Investidura.", completed: false },
      { id: "p3", text: "Complete un curso de verificación de antecedentes de protección infantil si es mayor de 18 años.", completed: false },
      { id: "p4", text: "Escriba un informe de una página o un video sobre lo que significa ser un GM y por qué desea convertirse en uno.", completed: false },
      {
        id: "p5",
        text: "Realiza los siguientes seminarios:",
        completed: false,
        subitems: makeSubs([
          "Ministerio del Club: Propósito e Historia",
          "Organización del club",
          "Programación y Planificación",
          "Alcance de los clubes",
          "Ceremonias y simulacros",
          "Desarrollo del Crecimiento",
          "Introducción a la Enseñanza",
          "Problemas médicos, gestión de riesgos y seguridad infantil",
        ], "p5"),
      },
      {
        id: "p6",
        text: "Elija una de las siguientes doctrinas de Creencias Fundamentales:",
        completed: false,
        subitems: makeSubs([
          "La Creación",
          "El Sábado",
          "La Experiencia de Salvación",
          "El Ministerio de Cristo en el Santuario Celestial",
          "El Remanente y la Misión",
          "La Segunda Venida de Cristo",
          "Bautismo",
          "Muerte y Resurrección",
          "Ministerios y Dones Espirituales",
        ], "p6"),
      },
      {
        id: "p7",
        text: "Complete la sección de aptitud física ganando el Medallón de Plata o Medallón de Oro.",
        completed: false,
        subitems: makeSubs([
          "Elija una aplicación de ejercicio físico y complete al menos un programa de tres meses.",
          "Complete un programa de acondicionamiento físico de tres meses recomendado por su médico.",
        ], "p7"),
      },
    ],
  },
  {
    id: "seccion1",
    title: "I. Identidad de Liderazgo y Crecimiento",
    subtitle: "Sabiduría",
    requirements: [
      {
        id: "s1-1",
        text: "Realiza los siguientes seminarios de liderazgo:",
        completed: false,
        subitems: makeSubs([
          "Liderazgo I: Fundamentos del Liderazgo Cristiano",
          "Liderazgo II: Liderazgo de Equipos",
          "Liderazgo III: Resolución de Conflictos",
          "Liderazgo IV: Mentoreo y Discipulado",
        ], "s1-1"),
      },
    ],
  },
  {
    id: "seccion2",
    title: "II. Desarrollo del Estilo de Vida",
    subtitle: "Estatura",
    requirements: [
      { id: "s2-1", text: "Lea o escuche el libro Educación de Elena G. White. Escriba una reflexión de una página.", completed: false },
      { id: "s2-2", text: "Tener u obtener la Especialidad de Evangelismo.", completed: false },
      {
        id: "s2-3",
        text: "Tener o ganar tres de las siguientes especialidades:",
        completed: false,
        subitems: makeSubs([
          "Multiculturalidad",
          "Pacificador",
          "Redes Sociales",
          "Una especialidad de ADRA no obtenida previamente",
          "Una especialidad de Artes Domésticas no ganada previamente",
        ], "s2-3"),
      },
      { id: "s2-4", text: "Participe en la organización de tres eventos sociales/de compañerismo con su iglesia local.", completed: false },
      {
        id: "s2-5",
        text: "Lea o escuche un libro sobre el liderazgo adventista y haga dos opciones de la Sección Compartir.",
        completed: false,
        hasShareOptions: true,
        shareOptionsCount: 2,
        selectedShareOptions: [],
      },
      {
        id: "s2-6",
        text: "Complete encuestas de Dones Espirituales y Personalidades con reflexiones de dos páginas cada una.",
        completed: false,
        subitems: makeSubs([
          "Encuesta de Dones Espirituales + reflexión",
          "Encuesta de Personalidades + reflexión",
        ], "s2-6"),
      },
      {
        id: "s2-7",
        text: "Lea o escuche El Camino a Cristo de Ellen G. White y haga dos opciones de la Sección Compartir.",
        completed: false,
        hasShareOptions: true,
        shareOptionsCount: 2,
        selectedShareOptions: [],
      },
      { id: "s2-8", text: "Escriba una reflexión personal de un párrafo sobre cada una de las 28 Creencias Fundamentales.", completed: false },
      { id: "s2-9", text: "Sea miembro activo del personal en un Club por al menos un año. Asista al 75% de las reuniones.", completed: false },
    ],
  },
  {
    id: "seccion3",
    title: "III. Crecimiento Espiritual",
    subtitle: "Favor con Dios",
    requirements: [
      { id: "s3-1", text: "Mantenga un diario devocional durante al menos seis meses.", completed: false },
      { id: "s3-2", text: "Complete un estudio profundo de un libro de la Biblia y presente un resumen escrito o en video.", completed: false },
      {
        id: "s3-3",
        text: "Dirija o participe en un grupo pequeño de estudio bíblico durante al menos un trimestre y haga dos opciones de la Sección Compartir.",
        completed: false,
        hasShareOptions: true,
        shareOptionsCount: 2,
        selectedShareOptions: [],
      },
      { id: "s3-4", text: "Participe en una semana de oración o retiro espiritual.", completed: false },
    ],
  },
  {
    id: "seccion4",
    title: "IV. Desarrollo Comunitario",
    subtitle: "Favor con el Hombre",
    requirements: [
      { id: "s4-1", text: "Planifique y ejecute un proyecto de servicio comunitario con su club o iglesia.", completed: false },
      { id: "s4-2", text: "Participe en al menos dos actividades de ADRA o servicio social.", completed: false },
      {
        id: "s4-3",
        text: "Organice o dirija una actividad de evangelismo juvenil y haga dos opciones de la Sección Compartir.",
        completed: false,
        hasShareOptions: true,
        shareOptionsCount: 2,
        selectedShareOptions: [],
      },
      { id: "s4-4", text: "Desarrolle y presente un plan de alcance comunitario para su iglesia local.", completed: false },
    ],
  },
];

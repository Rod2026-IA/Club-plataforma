import type { Section } from "./guiaMayorData";

export type ClassId = "amigo" | "companero" | "explorador" | "orientador" | "viajero" | "guia";
export type CardType = "progresiva" | "avanzada";

export const CLASSES: { id: ClassId; label: string; glow: string }[] = [
  { id: "amigo", label: "Amigo", glow: "neon-glow-cyan" },
  { id: "companero", label: "Compañero", glow: "neon-glow-green" },
  { id: "explorador", label: "Explorador", glow: "neon-glow-pink" },
  { id: "orientador", label: "Orientador", glow: "neon-glow-purple" },
  { id: "viajero", label: "Viajero", glow: "neon-glow-orange" },
  { id: "guia", label: "Guía", glow: "neon-glow-cyan" },
];

const r = (id: string, text: string) => ({ id, text, completed: false });

// Helper to build sections
const make = (defs: Array<{ id: string; title: string; reqs: string[] }>): Section[] =>
  defs
    .filter((d) => d.reqs.length > 0)
    .map((d) => ({
      id: d.id,
      title: d.title,
      requirements: d.reqs.map((t, i) => r(`${d.id}-${i + 1}`, t)),
    }));

// =============== AMIGO ===============
const amigoProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener por lo menos 10 años y/o estar en quinto grado (o su equivalente).",
    "Ser un miembro activo del Club de Conquistadores.",
    "Aprender de memoria y saber explicar el Voto y la Ley del Conquistador.",
    "Leer el libro \"El Sendero de la Felicidad\".",
    "Tener un certificado vigente del club de libros.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Aprender de memoria los libros del A.T. y saber los cinco grupos en que están divididos. Demostrar destreza en encontrar cualquiera de los libros del A.T. que se le pida.",
    "Tener un certificado vigente por saber los versículos de memoria (Gemas Bíblicas).",
    "Saber y explicar el Salmo 23 o el Salmo 46.",
    "Durante varios periodos de culto familiar, lee con tus padres el prólogo histórico del libro Primeros Escritos.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "En consulta con su consejero, busca forma de dedicar al menos dos horas mostrando amistad a alguien necesitado en tu comunidad realizando dos de las siguientes: a) Visitar a alguien que necesite amistad. b) Ayudar a una persona necesitada. c) Con la ayuda de otros, dedicar medio día a un proyecto de la comunidad, la escuela o la iglesia.",
    "Demostrar que eres un buen ciudadano en la escuela.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Enumera las cualidades de un buen amigo.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Intercambiar ideas sobre el periodo de tiempo comprendido entre la ascensión de Cristo y 1844.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Hablar sobre los principios de temperancia que tenía Daniel, o participar en un diálogo basado en Daniel 1.",
    "Saber de memoria y poder explicar Daniel 1:8 y tomar un voto personal para elegir un estilo de vida en armonía con los verdaderos principios de la temperancia.",
    "Aprender los principios de una alimentación sana y preparar como proyecto especial un diagrama de los grupos básicos que se dividen los alimentos.",
    "Completar la especialidad de Natación I.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Planifica y realiza una caminata de tres horas u ocho kilómetros.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Completar una de las siguientes especialidades: Gatos, Perros, Mamíferos, Semillas, Aves domésticas.",
    "Aprende diferentes métodos de purificar de agua y demuestra tu habilidad para construir un refugio de campamento.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Saber cómo se hace una soga y demostrar la manera correcta de usarla. Saber cómo hacer y conocer el uso práctico de los siguientes nudos: cote o media malla, falso, llano, corredizo, doble lazo, dos medios cotes, ballestrinque y as de guía o potreador.",
    "Pernoctar en un campamento.",
    "Aprobar un examen sobre medidas generales de seguridad.",
    "Armar y desarmar una carpa, y hacer una cama de campamento.",
    "Saber diez reglas para realizar caminatas y qué hacer cuando se está perdido.",
    "Aprender las señales de rastro y pista. Poder diseñar.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completar una especialidad en Artes y Habilidades Manuales.",
  ]},
]);

const amigoAvanzada: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Saber de memoria, cantar o tocar y poder explicar el significado del himno de los Conquistadores y de la primera estrofa del Himno Nacional.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Realiza la sopa de letras basado en el prólogo histórico del libro Primeros Escritos y completa los espacios en blanco.",
    "En consulta con tu consejero/a escoge uno de los siguientes personajes del antiguo testamento: José, Jonás, Esther o Ruth. Discutir en grupo la liberación y el cuidado amoroso de Cristo como se revela en la historia.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Llevar por lo menos dos visitas a la Escuela Sabática o al club de Conquistadores.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Demostrar buenos modales en la mesa con un grupo de personas de varias edades.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Presentar un examen basado en el periodo ascensión de Cristo y 1844.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Participa junto con tu clase en una conferencia o ver una presentación audiovisual sobre el VIH/SIDA.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Conocer e identificar 10 flores silvestres y 10 insectos de tu comunidad.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Demostrar cómo hornear, hervir y freír los alimentos de un campamento.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en actividades vocacionales o actividades agrícolas.",
  ]},
]);

// =============== COMPAÑERO ===============
const companeroProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener por lo menos 11 años y/o estar en el sexto grado (o su equivalente).",
    "Ser un miembro activo del club de Conquistadores.",
    "Aprender o repasar el significado del Voto de los Conquistadores e ilustrar su significado en una forma interesante.",
    "Leer el libro \"El Sendero de la Felicidad\", si no lo ha leído antes.",
    "Tener un Certificado vigente del Club de libros y escribir por lo menos un párrafo de reseña sobre uno de los libros.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Aprender de memoria los libros del N.T. y saber los cuatro grupos en que están divididos. Demostrar destreza encontrando cualquier libro que se le pida.",
    "Tener un certificado vigente por saber los versículos de memoria (Gemas Bíblicas).",
    "En consulta con su consejero, escoger uno de los siguientes temas: a) Una de las parábolas de Jesús, b) Uno de los milagros de Jesús, c) El sermón de la montaña, d) Un sermón sobre la Segunda Venida. Y mostrar su conocimiento sobre las enseñanzas de Jesús.",
    "Leer los evangelios de Mateo y Marcos en cualquier versión o traducción de la Biblia. Aprender de memoria dos de las siguientes sugerencias: a) Las Bienaventuranzas (Mt. 5:3-12), b) El Padre Nuestro (Mt. 6:9-13), c) El regreso de nuestro Señor (Mt. 24:4, 7, 11-14), d) El mandato evangélico (Mt. 28:18-20).",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "En consulta con su consejero, busque la forma de emplear, en una manera conveniente, dos horas en su comunidad, siendo un verdadero compañero a alguien que lo necesite.",
    "Pasar al menos medio día participando en una actividad que beneficiará a la comunidad o tu iglesia.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Discutir los sucesos que ocurrieron después del chasco.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Discuta el principio y demuestre el significado del respeto por las personas de diferentes culturas y géneros.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Aprender de memoria y explicar 1 Corintios 9:24-27.",
    "Hable con su consejero sobre la condición física y el ejercicio regular en lo que respeta a la vida saludable.",
    "Aprende sobre los efectos perjudiciales del tabaquismo en la salud y el estado físico. Escriba su propia promesa de compromiso con abstenerse del uso del tabaco.",
    "Completar la especialidad de Natación II.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Planificar y dirigir un servicio devocional para tu grupo.",
    "Ayude a su unidad o club a planificar un evento especial como una feria, una caminata o pasar la noche acampando.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Participa en juegos de la naturaleza o en un paseo de por lo menos una hora.",
    "Completar una de las siguientes especialidades: anfibios, árboles, arbustos, aves, aves de corral, ganadería, reptiles, moluscos.",
    "Repasa el estudio de la creación y mantenga un registro al aire libre de siete días de su observación personal.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Saber cómo encontrar los 8 puntos cardinales sin la ayuda de una brújula, usando las estrellas o un reloj.",
    "Participe en un campamento de dos noches. Saber al menos seis puntos relativos a la elección de un lugar para acampar.",
    "Saber o repasar los nudos requeridos en amigo. Atar y saber el uso práctico de los nudos.",
    "Pasar el examen de primeros auxilios para compañero.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en artes y manualidades que no hayas obtenido anteriormente.",
  ]},
]);

const companeroAvanzada: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Saber la composición y uso adecuado de la bandera nacional.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Lea acerca de la primera visión de Elena de White y discutir cómo Dios usa a los profetas para presentar su mensaje a la iglesia.",
    "Completa el crucigrama de la primera visión de Elena G. de White.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Participar en una actividad de testificación y traiga a un amigo que no sea adventista del séptimo día para que observe y participe.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Presentar un examen basado en los sucesos y pioneros que formaron la IGLESIA ADVENTISTA DEL SÉPTIMO DÍA.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Hable y demuestre respeto por sus padres / tutores y lo que ellos le brindan.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Plan de estudio sobre el VIH / SIDA.",
    "Realiza una de las siguientes actividades sobre salud: Asistir a un plan de 5 días, ver dos películas sobre salud, hacer un cartel sobre tabaquismo o abuso de las drogas, ayudar a preparar una exhibición sobre el tabaco para una feria u otra actividad de su preferencia.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Participar en un evento especial del club.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Identifica y describe doce pájaros silvestres y doce árboles nativos.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Realizar una de las siguientes opciones: construye cinco fuegos diferentes y describe sus usos junto a las reglas de seguridad al encender una fogata, caminar ocho kilómetros y mantener un registro.",
    "Cocina una comida de campamento sin la ayuda de utensilios.",
    "Prepare una maqueta de nudos con al menos 15 nudos y péguelos con goma Resistol dentro de los cuadros y escribe su nombre.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en Artes domésticas, salud y ciencia, vocacional o recreación no ganada anteriormente.",
  ]},
]);

// =============== EXPLORADOR ===============
const exploradorProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener por lo menos 12 años y/o estar cursando el séptimo grado (o su equivalente).",
    "Ser miembro activo del Club de Conquistadores y de la sociedad de jóvenes.",
    "Aprende o repasa la ley de los conquistadores y demuestra que lo comprendes.",
    "Leer el libro \"El Sendero de la Felicidad\", si no lo ha leído antes.",
    "Tener un certificado vigente del club de libros.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Familiarizarse con el uso de la concordancia bíblica.",
    "Tener un certificado vigente de Gemas Bíblicas.",
    "Leer los evangelios de Lucas y Juan en cualquier versión de la Biblia y discutir en su grupo tres de los siguientes temas: a) La lectura de las Escrituras (Luc. 4:16-19), b) Pedir, buscar, llamar (Luc. 11:9-13), c) Señales de la Segunda Venida (Luc. 21:25-29), d) La Humildad (Jn. 13:12-17), e) La promesa del Señor (Jn. 14:1-3), f) La Vid y los Pámpanos (Jn. 15:5-8).",
    "En consulta con su consejero, escoger uno de los siguientes pasajes para leerlo y discutirlo: a) Nicodemo (Jn. 3), b) La mujer junto al pozo (Jn. 4), c) El hijo pródigo (Luc. 15), d) El buen Samaritano (Luc. 10), e) Zaqueo (Luc. 19).",
    "Comparta su comprensión de cómo Jesús salva a las personas usando uno de los siguientes métodos: discusión en grupo con su consejero, dando una charla en la sociedad de jóvenes, escribiendo un ensayo, hacer una serie de imágenes, gráficos o modelos, escribe un poema o una canción.",
    "Aprender de memoria los siguientes textos: Proverbios 20:1 y Proverbios 23:29-32.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Familiarícese con los servicios comunitarios en su área y brinde asistencia al menos a uno.",
    "Participa en al menos tres programas de la iglesia.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Discutir el periodo de tiempo desde 1844 y la salida de J. N. Andrews como primer misionero Adventista al extranjero.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Participa en un panel de discusión acerca de la presión de grupo y su papel en la toma de decisiones.",
    "Visite las oficinas municipales o haga que un funcionario de la ciudad visite tu grupo.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Complete uno de los siguientes requisitos: participar en una discusión grupal sobre los efectos físicos de las drogas y el alcohol en el cuerpo, vea un audiovisual sobre el alcohol u otras drogas y discuta los efectos en el cuerpo humano.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Dirija el programa de apertura de su club o un programa de Escuela Sabática.",
    "Planifique y lleve a cabo una actividad social especial.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Identifica los siguientes elementos en el cielo: Polaris en la Osa Menor, Osa Mayor con las estrellas apuntadoras, Orión con su cinturón.",
    "Completar una de las siguientes especialidades: Huellas de animales, Cactus, Flores, Cosmografía, Climatología.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en artes domésticas o artes y manualidades que no hayas obtenido antes.",
  ]},
]);

const exploradorAvanzada: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Saber los elementos que componen la bandera de los conquistadores y banderines de unidad de conquistadores y el uso correcto de los mismos.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Lea acerca de J. N. Andrews. Discuta la importancia del servicio misionero para la iglesia.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Inscribir a un miembro en la escuela sabática, club de conquistadores o en un curso bíblico por correspondencia.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Presentar un examen basado en el periodo que abarca desde 1844 hasta 1874.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Obtenga una de las siguientes especialidades: Modales cristianos, Vida Familiar.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Participar en una caminata de 16 kilómetros y hacer una lista de la ropa que debe usarse en una actividad tal.",
    "Discusión acerca de la presión de grupo y concientización sobre el SIDA.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Participar en un evento especial del club como una investidura, actividad misionera, capacitación, día del conquistador, etc.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Repasa los pasajes básicos y construye un mueble de mobiliario para campamento.",
    "Planifique un menú para un viaje de campamento de 3 días para 4 personas utilizando al menos 3 alimentos deshidratados.",
    "Poder enviar y recibir el alfabeto semáforo, el código internacional Morse o saber el alfabeto en lenguaje de seña para sordos.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en las áreas de testificación, salud y ciencia, vocacional o recreación que no haya obtenido antes.",
  ]},
]);

// =============== ORIENTADOR ===============
const orientadorProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener por lo menos 13 años y/o estar cursando el octavo grado (o su equivalente).",
    "Memorizar y entender el blanco y lema de los Jóvenes Adventistas a través de dos pequeños diálogos.",
    "Ser miembro activo del club de Conquistadores.",
    "Seleccionar y leer tres libros de la lista del Club de Libros.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Descubrir mediante una discusión grupal: a) Qué es el cristianismo. b) Las señales de un verdadero discípulo. c) Los impulsos envueltos en llegar a ser un cristiano.",
    "Participar en un programa para marcar versículos en tu Biblia sobre la inspiración de las Sagradas Escrituras.",
    "Involucrar al menos a tres amigos para que tomen algún curso bíblico.",
    "Tener un certificado vigente de Gemas Bíblicas.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Con la ayuda de tu consejero, participa en al menos dos actividades diferentes de testificación.",
    "Con el apoyo de un amigo, dedica un día completo (al menos ocho horas) para participar en un proyecto de servicio a la iglesia, escuela o comunidad.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Asiste en calidad de oyente por lo menos a una junta directiva de tu iglesia local. Preparar un breve reporte para discutirlo con tu clase.",
    "Con tu clase hagan planes para organizar una reunión social por lo menos una vez cada tres meses.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Discutir con tu grupo los detalles principales que ocurrieron en el esparcimiento del mensaje Adventista.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "En una discusión grupal y en un estudio personal, examina tus aptitudes en dos de los siguientes tópicos: Autoconfianza, Amistad, Habilidades sociales y Fuerza de Voluntad.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Participa en una de las siguientes: a) Discutir los principios de un estilo de vida saludable. Presenta un esquema de tu programa diario de ejercicios. Escribe y firma un voto personal en el que te comprometes a hacer ejercicio físico de manera regular. b) Discute las ventajas de vivir un estilo de vida saludable basado en los principios bíblicos que promueve la Iglesia Adventista del Séptimo Día.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Construir y demostrar el uso de un horno reflector al cocinar algo de tu elección.",
    "Participar en un campamento de dos noches. Ser capaz de armar una mochila de campamento, incluye equipo y cocina suficiente.",
    "Aprobar el examen de primeros auxilios para Orientador.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Repasa la historia del diluvio y estudia al menos 3 diferentes fósiles.",
    "Completa una especialidad de Naturaleza no obtenida anteriormente.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en Recreación o en Artes y Habilidades Manuales.",
  ]},
]);

const orientadorAvanzada: Section[] = make([
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Obtén la especialidad de Civismo si aún no la tienes.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Dirige dos estudios bíblicos con amigos no Adventistas.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Completa los requisitos de la especialidad Ejercicios y Marchas si no lo has realizado anteriormente.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Presentar un examen basado en el periodo del esparcimiento del mensaje Adventista.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Participar en una de las siguientes actividades: a) Caminata de 15 km. Llevar un registro. b) Montar a caballo una distancia de 15 km. c) Hacer un viaje en canoa que dure un día. d) Montar bicicleta por 80 km. e) Nadar 1 km.",
    "Discutir el concepto, los tipos y el propósito de las citas.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Completar la especialidad de \"Orientación\".",
    "Poder encender un fuego en día de lluvia. Saber dónde conseguir material seco para mantenerlo ardiendo. Demostrar destreza en ajustar y cambiar correctamente el mango de un hacha.",
    "Identificar a primera vista, saber cómo preparar y comer diez variedades de plantas silvestres comestibles, ser capaz de leer y recibir treinta y cinco letras por minuto usando el código semáforo, ser capaz de enviar y recibir 15 letras por minuto usando el código internacional wigwag, ser capaz de enviar y recibir Mateo 24 usando lenguaje de señas, participar en un simulacro de búsqueda y rescate usando radios de 2 vías.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Ser capaz de identificar a través de fotografías, documentales, imágenes, o al aire libre una de las siguientes categorías: 25 hojas de árboles, 25 rocas o minerales, 25 flores silvestres, 25 mariposas o polillas o 25 conchas marinas.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad en Recreación o Artes y Manualidades no obtenida anteriormente.",
  ]},
]);

// =============== VIAJERO ===============
const viajeroProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener 14 años de edad y/o estar cursando el octavo grado o su equivalente.",
    "Explorar el significado del voto de los Jóvenes Adventistas.",
    "Ser un miembro activo del club de Conquistadores.",
    "Seleccionar y leer tres libros de la lista del Club de Libros.",
    "Discutir cómo un joven adventista debe relacionarse con las personas que lo rodean.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Estudiar la obra personal del Espíritu Santo y su relación con el hombre, y discutir su participación en el crecimiento espiritual.",
    "Aumentar el conocimiento de los acontecimientos finales que anteceden la Segunda Venida de Jesús mediante el estudio personal y el intercambio de ideas en grupo.",
    "Descubrir el verdadero significado de la observancia del sábado mediante el estudio y la discusión de evidencias bíblicas.",
    "Tener un certificado vigente de Gemas Bíblicas.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Invitar en grupo o en forma individual, por lo menos a un amigo a la iglesia.",
    "Ayudar a organizar y participar en grupo o individualmente en un proyecto de servicio a favor de otros.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Por medio del estudio personal y de la discusión en grupo, examina tus actitudes hacia dos de los siguientes tópicos: a) Autoconceptos, b) Las relaciones humanas, c) Ganar y gastar dinero, d) Presión de grupo.",
    "Enumerar y discutir las necesidades de las personas con discapacidad y ayudar a planificar y participar en una fiesta para ellos.",
  ]},
  { id: "iglesia", title: "Participación en la Iglesia", reqs: [
    "Prepara un diagrama sobre la organización de la iglesia local y enumerar las funciones de los departamentos.",
    "Participar en dos programas de la iglesia organizados por departamentos diferentes.",
    "Hacer planes con el grupo para tener una actividad social por lo menos una vez al trimestre.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Hacer una investigación acerca de los siguientes tópicos y destacar lo más importante por medio de drama, exposición, videos, otros.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Elija y complete dos de los requisitos de la especialidad de Temperancia presentado en el cuadernillo página 22-23.",
    "Organice una feria de salud. Incluir principios de salud, charlas, exhibiciones, otros.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Cumplir con los requisitos de la especialidad de Mayordomía (página 25).",
    "Completar la especialidad de Ejercicios y Marcha.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Repasa la historia de Nicodemo y relaciónala con el ciclo de vida de la mariposa.",
    "Completa una especialidad de Naturaleza que no hayas obtenido anteriormente.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Participar en grupos de no menos de cuatro personas, incluyendo a un adulto de experiencia como consejero, en una caminata de 25 km y acampar una noche al aire libre o en carpas. Llevar toda la comida que necesiten. Basado en las notas que tomó durante la caminata, participar en una discusión que dirija el consejero sobre el terreno, la flora y la fauna que encontraron.",
    "Completa una especialidad recreativa o de naturaleza que no hayas hecho antes.",
    "Aprobar el examen de Primeros Auxilios para Viajero.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad dentro de las siguientes categorías: Ministerio de Testificación, Salud y Ciencias, Artes Domésticas, Industrias al Aire Libre, o Vocacional que no hayas obtenido antes.",
  ]},
]);

const viajeroAvanzada: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Haga una presentación escrita u oral sobre el respeto a la ley de Dios y la autoridad civil.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Lea los libros de Proverbios, Isaías, Jeremías, Habacuc, Malaquías o complete el año bíblico.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Pase por lo menos dos horas con su pastor, anciano de iglesia o diácono, observándolo en su ministerio cualquier sea el caso.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Visitar un centro para minusválidos físicos o psíquicos y presentar un informe sobre la visita.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Presentar un examen acerca de la organización de la iglesia, expansión a nivel mundial y sus creencias fundamentales.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Estudie la técnica de rechazo eficaz de José y explique por qué es importante usarla hoy.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Completar la especialidad Testificación de Menores.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Planifique una lista de al menos cinco actividades relacionadas con la naturaleza que se pueden realizar los sábados por la noche.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Diseña y construye cinco muebles de campamento.",
  ]},
]);

// =============== GUÍA ===============
const guiaProgresiva: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Tener por lo menos 15 años y/o estar en décimo grado o su equivalente.",
    "Conocer y comprender la Legión de Honor de los Jóvenes Adventistas.",
    "Ser miembro activo del club de Conquistadores.",
    "Seleccionar y leer un libro de la lista del Club de Libros.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Discutir cómo el cristiano puede poseer los dones del espíritu santo como lo describe Pablo en su carta a los Gálatas.",
    "Estudiar y discutir cómo el servicio del santuario del antiguo testamento señala la cruz y el ministerio personal de Jesús.",
    "Leer y bosquejar tres historias de pioneros adventistas.",
    "Tener un certificado vigente de Gemas Bíblicas.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Ayuda a organizar y participar en un grupo o en forma individual en una de las siguientes actividades: a) Haz una visita amigable a alguna persona confinada en su casa o en un hospital.",
    "Participa en una discusión sobre testificación con otros adolescentes y pon en práctica algunas de las pautas en una situación real.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Trazar el desarrollo de la Iglesia Adventista del Séptimo Día en su Unión y Campo local.",
    "Buscar datos de la historia de la Iglesia local.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Mediante discusión grupal y por investigación personal, examina tus aptitudes en relación con dos de los siguientes temas: La elección de tu carrera, Elección de tu compañero(a) de vida, Comportamiento moral y Sexualidad y noviazgo.",
  ]},
  { id: "salud", title: "Salud y Bienestar Físico", reqs: [
    "Hacer una presentación a niños de nivel primaria sobre el tema de las leyes de la buena salud.",
    "Completar dos de las siguientes actividades: a) Escribir un poema o artículo sobre salud. b) Preparar y participar (como grupo) en un programa que enseñe cómo vivir una vida saludable, y presentarlo en su Sociedad, Iglesia o a otro grupo. c) Organizar y participar, en grupo o en forma individual, en una \"Carrera de Placer\" o una actividad similar. d) Leer el libro La Temperancia escrito por Elena G. White, pág. 102-125.",
  ]},
  { id: "liderazgo", title: "Organización y Desarrollo de Liderazgo", reqs: [
    "Después del análisis del tema, prepara un diagrama sobre la organización denominacional, con detalles especiales de la División Interamericana.",
    "Asistir al curso básico para dirigentes de Conquistadores organizado por la Asociación o Misión.",
    "Planificar y enseñar por lo menos dos requisitos de cualquier especialidad para un grupo de Conquistadores de la clase de Amigo o Compañero.",
  ]},
  { id: "naturaleza", title: "Estudio de la Naturaleza", reqs: [
    "Lee la historia de la infancia de Jesús en el capítulo 7 de \"El Deseado de todas las gentes\".",
    "Completar una de las siguientes especialidades: Ecología o Conservación Ambiental.",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Participa en un campamento de dos noches. Discute el equipo que llevarás.",
    "Planifica y prepara de manera satisfactoria una comida de tres platos utilizando una fogata al aire libre.",
    "Con tu grupo, construye un objeto usando nudos y amarres: torre, puente, mueble de campamento, etc.",
    "Completa una especialidad no estudiada anteriormente.",
  ]},
  { id: "estilo", title: "Enriquecimiento del Estilo de Vida", reqs: [
    "Completa una especialidad que no hayas obtenido antes. Puede ser en el área de Actividades Misioneras, Actividades Agrícolas, Actividades Vocacionales, Salud y Ciencia o Artes Domésticos.",
  ]},
]);

const guiaAvanzada: Section[] = make([
  { id: "generales", title: "Generales", reqs: [
    "Completa la especialidad de Mayordomía.",
  ]},
  { id: "espiritual", title: "Descubrimiento Espiritual", reqs: [
    "Lea El Camino a Cristo y escriba un reporte o ensayo de una hoja.",
  ]},
  { id: "sirviendo", title: "Sirviendo a Otros", reqs: [
    "Completa uno de los siguientes: a) Invita a dos amigos por lo menos a dos reuniones de tu iglesia. b) Ayuda a planificar y participa en al menos 4 reuniones de evangelismo juvenil o eventos similares.",
  ]},
  { id: "historia", title: "Historia Denominacional", reqs: [
    "Hacer un cronograma de los hechos más importantes de la historia de tu unión, asociación e iglesia local.",
  ]},
  { id: "amistad", title: "Desarrollo de la Amistad", reqs: [
    "Escribe o haz una presentación oral (10 minutos como mínimo) sobre el tema \"Cómo hacer y conservar amigos\".",
  ]},
  { id: "aire-libre", title: "Vida al Aire Libre", reqs: [
    "Completa la maestría en vida primitiva.",
  ]},
]);

export const CLASS_DATA: Record<ClassId, Record<CardType, Section[]>> = {
  amigo: { progresiva: amigoProgresiva, avanzada: amigoAvanzada },
  companero: { progresiva: companeroProgresiva, avanzada: companeroAvanzada },
  explorador: { progresiva: exploradorProgresiva, avanzada: exploradorAvanzada },
  orientador: { progresiva: orientadorProgresiva, avanzada: orientadorAvanzada },
  viajero: { progresiva: viajeroProgresiva, avanzada: viajeroAvanzada },
  guia: { progresiva: guiaProgresiva, avanzada: guiaAvanzada },
};
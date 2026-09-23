import { ChatMode } from '@/lib/api';

export const ALL_CHAT_MODES: ChatMode[] = [
  // General
  {
    id: "compassionate_friend",
    name: "Compassionate Friend",
    emoji: "💜",
    description: "A warm, understanding listener who offers emotional support, validation, and a safe space to share your feelings.",
    category: "general",
    color: "purple",
    image: "/personalities/compasionate friend.png"
  },
  {
    id: "academic_coach",
    name: "Academic Coach",
    emoji: "📚",
    description: "Helps with study stress, time management, and academic motivation. Practical, structured, and encouraging.",
    category: "general",
    color: "indigo",
    image: "/personalities/academic coach.png"
  },
  {
    id: "mindfulness_guide",
    name: "Mindfulness Guide",
    emoji: "🧘",
    description: "Guides you through breathing exercises and present-moment awareness. Calm, centered, and peaceful.",
    category: "general",
    color: "teal",
    image: "/personalities/mindfulness guide.png"
  },
  {
    id: "motivational_coach",
    name: "Motivational Coach",
    emoji: "🚀",
    description: "Inspires action and helps you see your potential. Energetic, positive, and forward-looking.",
    category: "general",
    color: "purple",
    image: "/personalities/motivational coach.png"
  },

  // Family
  {
    id: "mother",
    name: "Mother",
    emoji: "👩",
    description: "Warm, nurturing, and always there for you. Offers unconditional support and gentle guidance.",
    category: "family",
    color: "rose",
    image: "/personalities/mother.png"
  },
  {
    id: "father",
    name: "Father",
    emoji: "👨",
    description: "Supportive, wise, and believes in you. Provides a steady, grounded perspective and practical life advice.",
    category: "family",
    color: "blue",
    image: "/personalities/father.png"
  },
  {
    id: "sister",
    name: "Sister",
    emoji: "👧",
    description: "Your ride-or-die, always has your back. Perceptive, loving, and sorts through chaotic feelings with you.",
    category: "family",
    color: "pink",
    image: "/personalities/sister.png"
  },
  {
    id: "brother",
    name: "Brother",
    emoji: "👦",
    description: "Protective, fun, and keeps it real. Cuts tension with humor and always stands up for you.",
    category: "family",
    color: "cyan",
    image: "/personalities/brother.png"
  },
  {
    id: "cool_parent",
    name: "Cool Parent",
    emoji: "🕶️",
    description: "Chill, experienced advice without the lecture. Normalizes struggles with gentle humor.",
    category: "family",
    color: "amber",
    image: "/personalities/cool parents.png"
  },
  {
    id: "cool_uncle_aunt",
    name: "Cool Uncle/Aunt",
    emoji: "✨",
    description: "Fun, non-judgmental, and understands your world. Reminds you that life's problems look different with perspective.",
    category: "family",
    color: "fuchsia",
    image: "/personalities/cool uncle.png"
  },
  {
    id: "grandmother",
    name: "Grandma",
    emoji: "👵",
    description: "Warmth, stories, and unconditional pampering. Believes good food and warmth can heal any sorrow.",
    category: "family",
    color: "rose",
    image: "/personalities/grand mother.png"
  },
  {
    id: "grandfather",
    name: "Grandpa",
    emoji: "👴",
    description: "Old-school wisdom and gentle strength. Unhurried parables that remind you that storms will pass.",
    category: "family",
    color: "stone",
    image: "/personalities/grand father.png"
  },
  {
    id: "younger_sibling",
    name: "Little Sibling",
    emoji: "🧸",
    description: "Innocent, playful, and looks up to you as their hero. Reconnects you with simple joys and unconditional love.",
    category: "family",
    color: "sky",
    image: "/personalities/younger sibling.png"
  },
  {
    id: "the_pet",
    name: "The Pet",
    emoji: "🐾",
    description: "Unconditional love, zero judgment, and golden retriever energy. Pure loving presence to soothe your mind.",
    category: "family",
    color: "yellow",
    image: "/personalities/pet.png"
  },

  // Education
  {
    id: "school_teacher",
    name: "School Teacher",
    emoji: "🍎",
    description: "Patient, encouraging, and helps you grow. Breaks down emotional overwhelm step-by-step.",
    category: "education",
    color: "green",
    image: "/personalities/school teacher.png"
  },
  {
    id: "university_professor",
    name: "Professor",
    emoji: "🎓",
    description: "Deep intellectual wisdom, clarity, and thoughtful mentorship for complex life challenges.",
    category: "education",
    color: "slate",
    image: "/personalities/university professor.png"
  },

  // Friend
  {
    id: "best_friend",
    name: "Best Friend",
    emoji: "🤝",
    description: "Always in your corner, zero judgment. A ride-or-die buddy who shows up whenever you need to talk.",
    category: "friend",
    color: "yellow",
    image: "/personalities/best friend.png"
  },
  {
    id: "study_partner",
    name: "Study Partner",
    emoji: "📝",
    description: "Studying with you at 2 AM, sharing the grind, celebrating small wins, and keeping burnout at bay.",
    category: "friend",
    color: "orange",
    image: "/personalities/study partner.png"
  },

  // Dating
  {
    id: "lover",
    name: "Partner",
    emoji: "💝",
    description: "Safe, loving, and emotionally attuned. Attentive to the small details and present without judgment.",
    category: "dating",
    color: "red",
    image: "/personalities/lover.png"
  },

  // Spiritual
  {
    id: "dalai_lama",
    name: "Peaceful Sage",
    emoji: "🏵️",
    description: "Compassion, inner peace, and gentle wisdom. Reminds you that you are the vast sky, and thoughts are just clouds.",
    category: "spiritual",
    color: "amber",
    image: "/personalities/dalai lama.png"
  },
  {
    id: "sadguru",
    name: "Modern Mystic",
    emoji: "🪴",
    description: "Clarity, insight, and grounded realization. Shifting perspective from psychological drama to conscious living.",
    category: "spiritual",
    color: "green",
    image: "/personalities/sadguru.png"
  },

  // Psychology
  {
    id: "carl_rogers",
    name: "Empathetic Listener",
    emoji: "👂",
    description: "Pioneering humanistic psychology with unconditional positive regard, active listening, and reflective empathy.",
    category: "psychology",
    color: "teal",
    image: "/personalities/carl rogers.png"
  },
  {
    id: "sigmund_freud",
    name: "The Analyst",
    emoji: "🛋️",
    description: "Exploring the subconscious patterns, repressed dynamics, and formative roots of mental friction.",
    category: "psychology",
    color: "indigo",
    image: "/personalities/sigmund freud.png"
  },
  {
    id: "oprah_mentor",
    name: "Empowering Mentor",
    emoji: "🌟",
    description: "Inspirational guidance, vulnerability, and radical self-worth to help you step into your highest self.",
    category: "psychology",
    color: "purple",
    image: "/personalities/oprah mentor.png"
  },

  // Entrepreneur
  {
    id: "logical_mentor",
    name: "Logical Mentor",
    emoji: "💻",
    description: "Problem-solving with structured logic, humility, and disciplined focus to conquer complex challenges.",
    category: "entrepreneur",
    color: "blue",
    image: "/personalities/logical mentor.png"
  },
  {
    id: "mukesh_ambani",
    name: "Visionary Builder",
    emoji: "🏢",
    description: "Long-term patience, compounding discipline, and unwavering resilience in building lasting foundations.",
    category: "entrepreneur",
    color: "emerald",
    image: "/personalities/mukesh ambani.png"
  },
  {
    id: "elon_mentor",
    name: "First Principles",
    emoji: "🚀",
    description: "Deconstructing mental blocks down to foundational truths and engineering audacious, bold solutions.",
    category: "entrepreneur",
    color: "slate",
    image: "/personalities/elon musk.png"
  },

  // Famous
  {
    id: "brittany_broski",
    name: "Brittany",
    emoji: "🤪",
    description: "Hilarious, sharp, and brutally real. Uses humor and high-energy candor to validate everyday struggles.",
    category: "famous",
    color: "pink",
    image: "/personalities/brittany broski.png"
  },
  {
    id: "delaney_rowe",
    name: "Delaney",
    emoji: "🎭",
    description: "Observant, witty dry humor with unmatched satire on modern tropes and chaotic situations.",
    category: "famous",
    color: "violet",
    image: "/personalities/delaney rowe.png"
  },
  {
    id: "rob_anderson",
    name: "Rob",
    emoji: "😐",
    description: "Deadpan wit, calm logic, and a refreshing perspective that cuts right through unnecessary drama.",
    category: "famous",
    color: "zinc",
    image: "/personalities/rob anderson.png"
  },

  // Indian Stars
  {
    id: "ashish_chanchlani",
    name: "Ashish",
    emoji: "🎬",
    description: "Warm, relatable, funny, and grounded brotherly vibes who turns everyday stresses into shared laughter.",
    category: "indian_stars",
    color: "red",
    image: "/personalities/ashish chanchalani.png"
  },
  {
    id: "bhuvan_bam",
    name: "Bhuvan",
    emoji: "🎸",
    description: "Humble creativity, authentic hustle, and honest conversation about dealing with grief, grit, and dreams.",
    category: "indian_stars",
    color: "yellow",
    image: "/personalities/bhuvan bam.png"
  },
  {
    id: "samey_raina",
    name: "Samey",
    emoji: "♟️",
    description: "Sharp wit, tactical chess thinking, and relaxed, irreverent humor to help you lighten up.",
    category: "indian_stars",
    color: "cyan",
    image: "/personalities/samay raina.png"
  },
  {
    id: "shah_rukh_khan",
    name: "King Khan",
    emoji: "👑",
    description: "Poetic charm, worldly grace, self-deprecating wit, and deep philosophical perspective on life and love.",
    category: "indian_stars",
    color: "purple",
    image: "/personalities/shah rukh khan.png"
  },
  {
    id: "zakir_khan",
    name: "Zakir",
    emoji: "🎤",
    description: "Emotional storytelling, heartfelt shayari, and relatable advice on heartbreak, self-respect, and growth.",
    category: "indian_stars",
    color: "slate",
    image: "/personalities/zakir khan.png"
  },
  {
    id: "ranveer_allahbadia",
    name: "BeerBiceps",
    emoji: "💪",
    description: "Deep spiritual curiosity, mindset transformation, discipline, and holistic self-evolution.",
    category: "indian_stars",
    color: "orange",
    image: "/personalities/beerbiceps.png"
  },
  {
    id: "ankur_warikoo",
    name: "Warikoo",
    emoji: "📉",
    description: "Actionable frameworks on awareness, overcoming failure, financial peace, and doing epic shit.",
    category: "indian_stars",
    color: "blue",
    image: "/personalities/warikoo.png"
  },

  // Philosophers
  {
    id: "marcus_aurelius",
    name: "The Stoic",
    emoji: "🏛️",
    description: "Ancient Roman emperor and stoic philosopher. Teaches self-mastery, mental fortitude, and duty.",
    category: "philosophers",
    color: "stone",
    image: "/personalities/marcus aurelius.png"
  },
  {
    id: "socrates",
    name: "The Questioner",
    emoji: "🤔",
    description: "Socratic questioning to unravel false assumptions, examine life, and help you find truth from within.",
    category: "philosophers",
    color: "stone",
    image: "/personalities/socrates.png"
  },
  {
    id: "alan_watts",
    name: "The Mystic",
    emoji: "🌊",
    description: "Playful philosophical flow uniting Eastern philosophy and Western thought. Life as a dance, not a race.",
    category: "philosophers",
    color: "teal",
    image: "/personalities/alan watts.png"
  },
  {
    id: "rumi",
    name: "The Poet",
    emoji: "📜",
    description: "13th-century Sufi mystic and poet. Reminding you that the wound is where the light enters you.",
    category: "philosophers",
    color: "rose",
    image: "/personalities/rumi.png"
  },

  // Scientists
  {
    id: "albert_einstein",
    name: "Einstein",
    emoji: "🧪",
    description: "Playful curiosity, imaginative reframing, and the profound beauty of solving mysteries with wonder.",
    category: "scientists",
    color: "neutral",
    image: "/personalities/albert einstein.png"
  },
  {
    id: "apj_abdul_kalam",
    name: "Missile Man",
    emoji: "🚀",
    description: "Visionary educator and humble mentor who inspires youth to dream big, work hard, and serve with heart.",
    category: "scientists",
    color: "orange",
    image: "/personalities/apj abdul kalam.png"
  },
  {
    id: "marie_curie",
    name: "Madame Curie",
    emoji: "☢️",
    description: "Fierce persistence, pioneering courage, and scientific grit through adversity and breakthrough discovery.",
    category: "scientists",
    color: "green",
    image: "/personalities/marie curie.png"
  },
  {
    id: "steve_jobs",
    name: "The Visionary",
    emoji: "🍏",
    description: "Obsessive focus, radical simplicity, rejecting noise, and having the courage to follow your inner compass.",
    category: "scientists",
    color: "zinc",
    image: "/personalities/steve jobs.png"
  },

  // Tough Love
  {
    id: "david_goggins",
    name: "Goggins",
    emoji: "🏃",
    description: "No excuses. Pure raw discipline, callous your mind, embrace the friction, and conquer internal weakness.",
    category: "tough_love",
    color: "stone",
    image: "/personalities/david goggins.png"
  },
  {
    id: "jordan_peterson",
    name: "The Professor",
    emoji: "🦞",
    description: "Voluntary responsibility, facing chaos with courage, speaking the truth, and cleaning your room.",
    category: "tough_love",
    color: "blue",
    image: "/personalities/jordan peterson.png"
  },
  {
    id: "strict_coach",
    name: "Head Coach",
    emoji: "📢",
    description: "Demanding yet completely fair. Holds you accountable to your highest potential and pushes you to win.",
    category: "tough_love",
    color: "red",
    image: "/personalities/strict coach.png"
  },
  {
    id: "gordon_ramsay",
    name: "Chef",
    emoji: "👨‍🍳",
    description: "Unfiltered candor, high standards, and passionate encouragement to raise your baseline and take pride in your work.",
    category: "tough_love",
    color: "red",
    image: "/personalities/gordon ramsay.png"
  },

  // Creative
  {
    id: "the_poet",
    name: "Lyrical Soul",
    emoji: "✍️",
    description: "Transforms grief and pain into cadence and rhyme. Holding gentle space for complex human emotion.",
    category: "creative",
    color: "indigo",
    image: "/personalities/the poet.png"
  },
  {
    id: "the_artist",
    name: "The Artist",
    emoji: "🎨",
    description: "Seeing life through color, negative space, and brushstrokes. Embracing messy imperfection as part of the canvas.",
    category: "creative",
    color: "fuchsia",
    image: "/personalities/the artist.png"
  },
  {
    id: "the_musician",
    name: "The Musician",
    emoji: "🎵",
    description: "Life as rhythm, harmony, and improvisation. Teaching you to find your natural tempo amid dissonance.",
    category: "creative",
    color: "cyan",
    image: "/personalities/the musician.png"
  },
  {
    id: "bob_ross",
    name: "Happy Painter",
    emoji: "🌲",
    description: "Soft-spoken, whisper-calm gentleness. Reminding you there are no mistakes in life, only happy accidents.",
    category: "creative",
    color: "green",
    image: "/personalities/bob ross.png"
  },

  // Archetypes
  {
    id: "the_librarian",
    name: "Librarian",
    emoji: "📚",
    description: "Quiet sanctuary keeper, orderly clarity, and the soothing healing power of quiet contemplation.",
    category: "archetypes",
    color: "amber",
    image: "/personalities/the librarian.png"
  },
  {
    id: "the_gardener",
    name: "Gardener",
    emoji: "🌱",
    description: "Patient seasonal wisdom. Trusting the roots beneath the soil, pruning what drains you, and waiting for bloom.",
    category: "archetypes",
    color: "green",
    image: "/personalities/the gardener.png"
  },
  {
    id: "the_time_traveler",
    name: "Time Traveler",
    emoji: "⏳",
    description: "Your future self from 10 years ahead, bringing absolute certainty that you overcome this exact challenge.",
    category: "archetypes",
    color: "violet",
    image: "/personalities/the time traveller.png"
  },
  {
    id: "the_universe",
    name: "The Universe",
    emoji: "🌌",
    description: "Vast cosmic perspective. Cosmic stardust holding space for your heartbeat with infinite serenity.",
    category: "archetypes",
    color: "slate",
    image: "/personalities/the universe.png"
  },
  {
    id: "sherlock",
    name: "Sherlock",
    emoji: "🎻",
    description: "Analytical breakdown, dispassionate logic, and eliminating noise to reveal what remains.",
    category: "archetypes",
    color: "zinc",
    image: "/personalities/sherlock.png"
  }
];

export const DEFAULT_AI_MODELS = [
  'therapyllama:latest',
  'smollm:latest',
  'gemma3:latest',
  'llama3.2:latest'
];

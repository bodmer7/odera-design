/* ==========================================================================
   i18n — Deutsch steht im HTML, Englisch hier.
   Beim Wechsel auf EN werden die deutschen Originale aus dem DOM gesichert
   und beim Zurückschalten wiederhergestellt. Neue Texte also einfach im
   HTML pflegen und hier die englische Entsprechung ergänzen.
   ========================================================================== */
window.NB_I18N = {
  /* Texte, die JavaScript selbst setzt */
  ui: {
    de: { themeToLight: "Light", themeToDark: "Dark", lang: "EN", copy: "Kopieren", copied: "Kopiert" },
    en: { themeToLight: "Light", themeToDark: "Dark", lang: "DE", copy: "Copy", copied: "Copied" }
  },

  en: {
    "skip": "Skip to content",

    "nav.menu": "Menu",
    "nav.close": "Close",
    "nav.about": "About",
    "nav.career": "Career",
    "nav.projects": "Projects",
    "nav.skills": "Skills",
    "nav.education": "Education",
    "nav.contact": "Contact",

    "menu.about": "About me",
    "menu.career": "Career",
    "menu.projects": "Projects",
    "menu.skills": "Skills",
    "menu.education": "Education",
    "menu.contact": "Contact",

    "hero.kicker": "Websites &amp; digital projects — Zurich / Aargau",
    "hero.text1": "I build websites and my own applications.",
    "hero.text2": "My day job is in data &amp; AI, and I am studying Digital Business &amp; AI.",
    "hero.cta1": "See my work",
    "hero.cta2": "Get in touch",

    "metrics.since1": "In IT since",
    "metrics.since2": "",
    "metrics.stations": "Roles",
    "metrics.efz": "Platform Developer EFZ",

    "about.title": "Support, deployment, projects of my own",
    "about.p1": "I started in IT as an apprentice in 2021: level 1 and level 2 support, device management, weekly short presentations for the team. Then technical support on site with customers, followed by deploying internal applications on Red Hat OpenShift and IBM Cloud plus web development with React.",
    "about.p2": "Today I work in data &amp; AI: requirements analysis, proposals, technical concepts. From September 2026 I add a part-time BSc in Digital Business &amp; AI at HWZ Zurich.",
    "about.p3": "Alongside that I build websites and my own applications with current AI tooling. Someone who has done support builds pages that are still maintainable two years later.",

    "career.hint": "Open a row — click or Enter",
    "career.title": "Professional career",

    "job1.b1": "Contributing to RFPs, proposals and sales activities in data &amp; AI",
    "job1.b2": "Solution design from requirements analysis to the technical concept",
    "job1.b3": "Working with cross-functional teams",
    "job1.b4": "Supporting events and customer sessions (including TechXchange)",

    "job2.b1": "Deploying internal applications on Red Hat OpenShift and IBM Cloud",
    "job2.b2": "Web development with HTML, CSS, JavaScript and React",
    "job2.b3": "Improving existing internal applications for better usability",

    "job3.b1": "Repairing Lenovo devices on site with customers",
    "job3.b2": "Robotics projects with the Pepper robot",
    "job3.b3": "IT and security training at secondary schools",

    "job4.b1": "Level 1 and level 2 support for internal staff",
    "job4.b2": "Device management: setup, migration and data wiping of Mac and Windows laptops",
    "job4.b3": "Weekly short presentations for the team",

    "projects.title": "Selected work",
    "filter.all": "All",
    "filter.websites": "Websites",
    "filter.apps": "Apps",
    "filter.tools": "Tools",

    "ba.after": "After — odera.ch",
    "ba.before": "Before — example",
    "ba.aria": "Before/after comparison",

    "fact.start": "Situation",
    "fact.task": "Task",
    "fact.result": "Result",

    "projects.eyebrow": "Work",

    "odera.title": "ODERA — websites for small businesses",
    "odera.text": "My own website offering — concept, build and operation from one hand.",
    "odera.note": "The slider above is an illustrative comparison, not a client project.",
    "odera.tag1": "Concept",
    "odera.tag2": "Design",
    "odera.tag3": "Build",

    "prognose.title": "Forecasting app",
    "prognose.text": "Currently in development.",

    "retro.nav1": "Home",
    "retro.nav2": "Services",
    "retro.nav3": "Approach",
    "retro.nav4": "Contact",
    "retro.new": "NEW",
    "retro.link1": "»&nbsp;About us",
    "retro.link2": "»&nbsp;Services",
    "retro.link3": "»&nbsp;References",
    "retro.link4": "»&nbsp;Approach",
    "retro.link5": "»&nbsp;Contact",
    "retro.head": "A Warm Welcome",
    "retro.img": "Image",
    "retro.p1": "Welcome to our internet site. For many years we have been providing reliable services to customers in the region. On the following pages you will learn more about our offering and our approach.",
    "retro.p2": "Contact us for a no-obligation conversation. We look forward to hearing from you and finding the right solution together.",
    "retro.updated": "Last updated: 12/03/2011",

    "geo.title": "Geo quiz — guess places on the map",
    "geo.start": "You know your own region from the bike and the train window — and still cannot find it on a blank map.",
    "geo.task": "Build a quiz app where places are tapped on an unlabelled map. Scoring is based on the distance to the correct point.",
    "geo.result": "Live web app with eight questions per round, an aerial map and its own logo.",
    "geo.live": "Try it live",

    "health.title": "Health dashboard — watch data at a glance",
    "health.start": "The sports watch collects health data every day that stays locked inside the vendor app.",
    "health.task": "Make the data available locally and read-only, and build a morning dashboard from it.",
    "health.result": "A server with 20 read-only operations plus an automatically updated dashboard covering readiness, sleep, achievements and weight goal.",

    "websites.wip": "In progress",
    "websites.soon": "Preview to follow",

    "skills.title": "Six core skills",
    "skill1.name": "Web development",
    "skill1.ctx": "HTML, CSS, JavaScript, React — own projects and internal applications",
    "skill2.name": "Deployment &amp; cloud",
    "skill3.name": "Websites for companies",
    "skill3.ctx": "Concept, build, go-live",
    "skill3.alt": "Own clients · Web Development &amp; Deployment",
    "skill4.ctx": "Building my own applications with current AI tools",
    "skill4.alt": "Tech Seller Data &amp; AI · own projects",
    "skill5.name": "Requirements &amp; concepts",
    "skill5.ctx": "From the customer conversation to the technical solution",
    "skill6.name": "IT support &amp; operations",
    "skill6.ctx": "Level 1 and 2, device management, ticketing",
    "skills.langs": "German — native · English — fluent · French — good",

    "edu.hwz": "HWZ University of Applied Sciences in Business Administration Zurich — part-time",
    "edu.from": "From 09/2026",
    "edu.tbz": "Technical vocational school Zurich",
    "edu.bm": "Federal vocational baccalaureate, technical focus",
    "edu.bms": "Vocational baccalaureate school Zurich",

    "contact.kicker": "Open to projects and conversations",
    "contact.title": "Write<br>to me",
    "contact.copy": "Copy",
    "contact.copyAria": "Copy address",
    "contact.cv": "CV (PDF) ↗",

    "footer.region": "Zurich area",
    "footer.hint": "Press T or swipe from the right edge"
  }
};

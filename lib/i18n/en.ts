export const en = {
  nav: {
    wordmark: "TRACE",
    howItWorks: "How it works",
    checkImage: "Check an image",
    about: "About",
    demoBadge: "DEMO MODE",
  },
  intro: {
    hudVersion: "TRACE // v1.0",
    hudCategory: "DIGITAL IMAGE FORENSICS",
    statusMessages: [
      "INITIALISING FORENSIC ENGINE",
      "CALIBRATING PIXEL ANALYSIS",
      "WAKING UP ADRIA",
      "READY",
    ],
  },
  hero: {
    eyebrow: "DIGITAL IMAGE FORENSICS FOR EVERYONE",
    headline: "Every edit leaves a trace.",
    subCopy:
      "Check whether an image has been morphed, face-swapped or AI-generated. In seconds, in plain language, with clear next steps.",
    ctaPrimary: "Check an image",
    ctaSecondary: "How it works",
    trustChips: [
      "No account",
      "Images not stored",
      "Probability, not proof",
    ],
    scrollHint: "SCROLL",
  },
  problem: {
    headline: "When a fake spreads, three things break at once.",
    cards: [
      {
        number: "01",
        title: "Detection fails",
        description:
          "Most people can't tell real from fake by eye, and the tools that can are built for researchers.",
      },
      {
        number: "02",
        title: "Response fails",
        description:
          "Victims often don't know where to report or how to show an image was altered, and shame keeps many silent.",
      },
      {
        number: "03",
        title: "Trust fails",
        description:
          "Once doubt exists, even real images get dismissed.",
      },
    ],
  },
  howItWorks: {
    headline: "How it works",
    steps: [
      {
        number: "01",
        title: "Upload",
        description: "Select or drop an image you need to inspect.",
      },
      {
        number: "02",
        title: "Analyse",
        description:
          "Forensic models examine artifacts, noise consistency, and synthetic signatures.",
      },
      {
        number: "03",
        title: "Understand & act",
        description:
          "Review clear likelihood scores, plain-language explanations, and legal/mental-health next steps.",
      },
    ],
    limitationsTitle: "Limitations note",
    limitationsText:
      "Detection models are strongest on AI-generated images and face-swaps. Traditional hand-edited morphs (e.g. Photoshop composites) and heavily compressed images (WhatsApp forwards) can be missed or mis-scored. A low score does not prove an image is real.",
  },
  analyze: {
    step1: "01 UPLOAD",
    step2: "02 ANALYSE",
    step3: "03 RESULT",
    dropzone: {
      title: "Drop an image here",
      sub: "or click to browse · JPG, PNG, WebP · up to 8 MB",
      clipboardHint: "or paste from clipboard (Ctrl / ⌘ + V)",
      dragOver: "Release to scan",
      privacyNote: "Your image is analysed and not stored.",
      rightsNote: "Only upload images you have the right to check.",
    },
    preview: {
      analyseBtn: "Analyse image",
      chooseAnotherBtn: "Choose another",
      altText: "Preview of the uploaded image",
    },
    processing: {
      ariaLive: "Analysing image",
      statusRotations: [
        "EXAMINING TEXTURE PATTERNS",
        "CHECKING EDGE CONSISTENCY",
        "COMPARING LIGHTING",
        "LOOKING FOR GENERATION ARTEFACTS",
      ],
      cancelBtn: "Cancel",
    },
    result: {
      verdicts: {
        likely_authentic: "No strong signs of manipulation were found.",
        suspicious:
          "Some signs of manipulation were found. Treat this image with caution.",
        likely_manipulated:
          "This image shows strong signs of manipulation.",
      },
      labels: {
        likely_authentic: "Likely Authentic",
        suspicious: "Suspicious",
        likely_manipulated: "Likely Manipulated",
      },
      confidence: "Confidence",
      confidenceLevels: {
        low: "Low",
        medium: "Medium",
        high: "High",
      },
      reasonsTitle: "Why we think this",
      disclaimer:
        "This is an automated assessment, not legal proof. Detection tools can be wrong, especially on compressed or heavily edited images.",
      actions: {
        checkAnother: "Check another image",
        askAdria: "Ask ADRIA about this result",
        copySummary: "Copy summary",
        copiedToast: "Summary copied to clipboard",
      },
    },
    nextSteps: {
      title: "Recommended next steps",
      items: [
        {
          id: "preserve",
          title: "Preserve evidence",
          description:
            "Capture screenshots, save URLs, note sender details, and record exact timestamps. Do not delete messages or chats.",
        },
        {
          id: "report",
          title: "Report to authorities",
          description:
            "File a complaint at cybercrime.gov.in or call 1930 (national cyber helpline in India).",
        },
        {
          id: "stopncii",
          title: "Intimate images",
          description:
            "StopNCII.org creates digital hashes of non-consensual intimate imagery to prevent circulation across participating tech platforms.",
        },
        {
          id: "minors",
          title: "Minors involved",
          description:
            "Call Childline 1098 immediately. Report the incident directly to a trusted adult, family member, or school authority.",
        },
        {
          id: "support",
          title: "You are not alone",
          description:
            "Blackmailers rely on silence and fear. Reach out to someone you trust. For free, confidential mental health support in India, call Tele-MANAS at 14416.",
        },
      ],
      note: "Helpline details can change. Verify on the official sites.",
    },
    errors: {
      unsupportedType:
        "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
      tooLarge: "File is too large. Maximum image size is 8 MB.",
      tooSmall: "Image dimensions are too small (minimum 64×64 pixels).",
      rateLimited: "Too many requests. Please wait a moment and try again.",
      providerError:
        "Detection service is temporarily unavailable. Please try again shortly.",
      timeout: "The analysis request timed out. Please check your connection and retry.",
      offline: "You appear to be offline. Please verify your internet connection.",
      generic: "An unexpected error occurred during analysis.",
      retry: "Try again",
    },
  },
  adria: {
    name: "ADRIA",
    tagline: "TRACE Safety Assistant",
    statusIdle: "Ready to assist",
    statusListening: "Listening...",
    statusThinking: "Thinking...",
    statusSpeaking: "Speaking...",
    placeholder: "Type a message or tap mic to speak...",
    micUnsupported: "Voice input isn't supported in this browser. Try Chrome or Edge.",
    footerDisclaimer:
      "ADRIA is an AI assistant and can make mistakes. For emergencies, contact local authorities.",
    suggestions: [
      "How does TRACE work?",
      "What do I do if someone is blackmailing me?",
      "Explain my result",
      "Is my image stored?",
    ],
  },
  about: {
    eyebrow: "ABOUT TRACE",
    headline: "Built to see what's hidden.",
    body: "TRACE is a project by Chethana Poorvi K N, P. Harshini Reddy, P. Omsai Reddy, and Pavan Tej R, built to explore and understand the hidden details in digital images.",
    team: [
      { name: "Chethana Poorvi K N", initials: "CP" },
      { name: "P. Harshini Reddy", initials: "HR" },
      { name: "P. Omsai Reddy", initials: "OR" },
      { name: "Pavan Tej R", initials: "PT" },
    ],
  },
  footer: {
    wordmark: "TRACE",
    privacyLine:
      "Images are processed to produce a result and are not stored by TRACE.",
    privacyNote: "Privacy Note",
    limitations: "Limitations",
    backToTop: "Back to top",
  },
}

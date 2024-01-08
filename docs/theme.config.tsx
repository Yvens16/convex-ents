import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";
import { Details, Summary } from "./components/details";

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: "bold", fontSize: "1.5rem" }}>Ents</span>,
  project: {
    // TODO:
    link: "https://github.com/xixixao",
  },
  chat: {
    link: "https://www.convex.dev/community",
  },
  // TODO:
  docsRepositoryBase: "https://github.com/xixixao",
  gitTimestamp() {
    return <></>;
  },
  footer: {
    text: "Convex Ents © 2023 xixixao. All rights reserved.",
  },
  components: {
    details: Details,
    summary: Summary,
  },
};

export default config;

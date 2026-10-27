import type { CareerProviderName } from "./parse";

export type CatalogBoard = {
  provider: CareerProviderName;
  externalKey: string;
  companyName: string;
  careersUrl: string;
};

function comeet(company: string, key: string): CatalogBoard {
  const [slug, uid] = key.split("/");
  return {
    provider: "comeet",
    externalKey: key,
    companyName: company,
    careersUrl: `https://www.comeet.com/jobs/${slug}/${uid}`,
  };
}

function greenhouse(company: string, token: string): CatalogBoard {
  return {
    provider: "greenhouse",
    externalKey: token,
    companyName: company,
    careersUrl: `https://job-boards.greenhouse.io/${token}`,
  };
}

/** Public board ids for Israeli employers. Comeet ids come from public career pages. Other hosts are added when a link is pasted. */
export const STARTER_BOARDS: readonly CatalogBoard[] = [
  greenhouse("monday.com", "mondaydotcom"),
  greenhouse("Fiverr", "fiverr"),
  greenhouse("Riskified", "riskified"),
  greenhouse("Similarweb", "similarweb"),
  greenhouse("Payoneer", "payoneer"),
  greenhouse("JFrog", "jfrog"),
  greenhouse("Taboola", "taboola"),
  greenhouse("Outbrain", "outbrain"),
  greenhouse("AppsFlyer", "appsflyer"),
  greenhouse("Rapyd", "rapyd"),
  greenhouse("Lemonade", "lemonade"),
  greenhouse("Sisense", "sisense"),
  greenhouse("WalkMe", "walkme"),
  greenhouse("Moon Active", "moonactive"),
  comeet("VAST Data", "vastdata/43.001"),
  comeet("Claroty", "Claroty/F2.004"),
  comeet("Quantum Machines", "quantummachines/d6.000"),
  comeet("Kaltura", "kaltura/E2.00D"),
  comeet("Coralogix", "coralogix/06.004"),
  comeet("ScyllaDB", "scylladb/E4.006"),
  comeet("Global-e", "global-e/62.002"),
  comeet("SolarEdge", "solaredge/71.00A"),
  comeet("Checkmarx", "checkmarx/C0.008"),
  comeet("eToro", "etoro/41.009"),
  comeet("BioCatch", "biocatch/03.00E"),
  comeet("UVeye", "uveye/92.00F"),
  comeet("Fetcherr", "fetcherr/68.006"),
  comeet("Nova", "nova/A5.007"),
  comeet("Team8", "team8/61.003"),
  comeet("ONE ZERO Bank", "onezerobank/36.00A"),
  comeet("Discount Bank", "dbank/F8.004"),
  comeet("INFINIDAT", "infinidat/D6.003"),
  comeet("SafeBreach", "safebreach/53.004"),
  comeet("Upwind Security", "upwind/49.004"),
  {
    provider: "workday",
    externalKey: "nvidia.wd5.myworkdayjobs.com|nvidia|NVIDIAExternalCareerSite",
    companyName: "NVIDIA",
    careersUrl: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
  },
];

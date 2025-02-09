declare module "string-similarity" {
    export function compareTwoStrings(first: string, second: string): number;
    export function findBestMatch(mainString: string, targetStrings: string[]): {
      bestMatch: { target: string; rating: number };
      ratings: { target: string; rating: number }[];
    };
  }
  
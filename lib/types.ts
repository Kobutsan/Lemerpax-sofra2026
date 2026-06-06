export type Photo = {
  id: string;
  displayUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  blurDataURL: string;
  photographer: string;
};

export type Archive = {
  url: string | null;
  size: number;
  count: number;
  generatedAt: string | null;
};

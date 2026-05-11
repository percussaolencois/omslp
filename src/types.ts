export interface Partitura {
  id: string;
  titulo?: string;
  pdfUrl?: string;
  pagSelecionadas?: number[];
  pages?: NotebookPage[];
}

export interface NotebookPage {
  id: string;
  pdfUrl: string;
  originalPageNumber: number;
  annotationKey?: string;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  type: 'pencil' | 'highlighter';
}

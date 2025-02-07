export interface GridItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
}

export interface GridState {
  items: GridItem[];
  isLoading: boolean;
  error?: string;
}

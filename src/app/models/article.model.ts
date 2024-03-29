export interface Article {
  title: string;
  url: string;
  oneliner: string;
  date: Date,
  tags: string[];
}

export type ArticleDto = Omit<Article, 'date'> & {
  date: string;
}

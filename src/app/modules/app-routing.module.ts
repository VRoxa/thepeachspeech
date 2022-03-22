import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArticleViewComponent } from '../components/article-view/article-view.component';
import { ArticlesRepositoryComponent } from '../components/articles-repository/articles-repository.component';
import { HomeComponent } from '../components/home/home.component';

const routes: Routes = [
  { path: 'article/:link', component: ArticleViewComponent },
  { path: 'repository', component: ArticlesRepositoryComponent },
  { path: '', component: HomeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: false,
    anchorScrolling: 'enabled',
    scrollPositionRestoration: 'enabled',
    relativeLinkResolution: 'corrected',
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

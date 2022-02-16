import { NgModule } from "@angular/core";

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@NgModule({
  exports: [
    MatSidenavModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ]
})
export class MaterialModule { }
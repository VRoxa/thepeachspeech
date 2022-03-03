import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'capitalize' })
export class CapitalizePipe implements PipeTransform {

  public transform([first, ...str]: string) {
    return first.toUpperCase() + str.join('');
  }
} 
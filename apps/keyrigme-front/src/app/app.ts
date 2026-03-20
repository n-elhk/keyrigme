import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    <main class="main-container">
      <router-outlet />
    </main>
  `,
})
export class App {}

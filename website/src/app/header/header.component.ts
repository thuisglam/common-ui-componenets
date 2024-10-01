import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, TranslateModule ],
  providers: [
    TranslateService // Provide TranslateService manually
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() navigatechanged = new EventEmitter();
  @Output() languagechanged = new EventEmitter();
  translate = inject(TranslateService);
  cd = inject(ChangeDetectorRef);
  selectedNav = 'home';

  constructor() {
    const savedLang = localStorage.getItem('language') || 'nl';
    this.translate.setDefaultLang(savedLang);
    this.translate.use(savedLang);
  }

  clickedItem(name: string) {
    this.selectedNav = name;
    this.navigatechanged.emit(name);
    this.cd.detectChanges();
  }

  changeLanguage(event: any) {
    const language = event.target.value
    this.translate.setDefaultLang(language);
    this.translate.use(language);
    this.languagechanged.emit(language);
    console.log(language);
    this.cd.detectChanges();
  }

  isHomePage = () => this.selectedNav === 'home';

}

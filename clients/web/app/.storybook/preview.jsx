import { darkClass, lightClass } from '../src/ui/styles/atoms/storybook.css';
import { themeDark, themeLight } from './theme';

export const parameters = {
  darkMode: {
    stylePreview: true,
    classTarget: 'body',
    dark: themeDark,
    light: themeLight,
    darkClass: lightClass,
    lightClass: darkClass
  }
}

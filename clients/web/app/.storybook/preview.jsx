import { darkClass, lightClass } from '../src/ui/styles/css/storybook.css';
import { FontLoader } from '../src/ui/utils/FontLoader';
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

FontLoader.init()

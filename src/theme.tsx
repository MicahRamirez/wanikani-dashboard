import { createMuiTheme } from "@material-ui/core/styles";
import red from "@material-ui/core/colors/red";

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#153612",
    },
    secondary: {
      main: "#865630",
    },
    error: {
      main: red.A400,
    },
    background: {
      default: "#e0e2e0",
    },
  },
});

export default theme;

import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useWindowSize } from "react-use";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Avatar from "@material-ui/core/Avatar";
import Drawer from "@material-ui/core/Drawer";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import Box from "@material-ui/core/Box";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import SettingsIcon from "@material-ui/icons/Settings";
import TimelineIcon from "@material-ui/icons/Timeline";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import MenuBookIcon from "@material-ui/icons/MenuBook";

const API_KEY_LOCAL_STORAGE = "apiKey";
const isClientSide = () => typeof Storage !== "undefined";

interface WKDashAppBarProps {
  children?: React.ReactNode;
}

const NAV_ARR = [
  {
    href: "/projections",
    copy: "Projections",
    icon: <TimelineIcon />,
  },
  {
    href: "/performance",
    copy: "Performance",
    icon: <TrendingUpIcon />,
  },
  {
    href: "/accuracy",
    copy: "Accuracy",
    icon: <DoneAllIcon />,
  },
  {
    href: "/bookclub",
    copy: "Book Club",
    icon: <MenuBookIcon />,
  },
];

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  linkBox: {
    flexGrow: 1,
    display: "flex",
  },
  link: {
    display: "flex",
    flexGrow: 0.5,
  },
  colorDefault: {
    backgroundColor: theme.palette.secondary.main,
  },
  appBar: {
    borderBottom: `solid ${theme.palette.secondary.main}`,
  },
  colorPrimary: {
    fill: "white",
  },
  stop: {
    display: "flex",
    flexGrow: 5,
  },
  small: {
    width: theme.spacing(4),
    height: theme.spacing(4),
  },
  siteLogoContainer: {
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(2),
  },
  siteLogo: {
    border: "solid",
    padding: "0 4px 0 4px",
  },
  linkTextUnderline: {
    borderBottom: "2px solid",
  },
}));
const useMenuStyles = makeStyles((_) => ({
  link: {
    display: "flex",
    flexGrow: 0.5,
  },
  linkBox: {
    flexGrow: 1,
    display: "flex",
  },
  linkTextUnderline: {
    borderBottom: "2px solid",
  },
  stop: {
    display: "flex",
    flexGrow: 5,
  },
  list: {
    width: 250,
  },
  fullList: {
    width: "auto",
  },
  drawerLogo: {
    margin: "10px",
  },
}));

const useSiteLogoStyles = makeStyles((theme) => ({
  siteLogoContainer: {
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(2),
  },
  siteLogo: {
    border: "solid",
    padding: "0 4px 0 4px",
    color: "white",
  },
}));

const MobileNavMenu: React.FC<{ apiKey: string | undefined }> = ({
  apiKey,
}) => {
  const classes = useMenuStyles();
  const [isOpen, setIsOpen] = useState(false);

  const list = () => {
    return (
      <div
        className={classes.list}
        role="presentation"
        onClick={() => setIsOpen(false)}
        onKeyDown={() => setIsOpen(false)}
      >
        <List>
          {NAV_ARR.map(({ copy, icon, href }) => {
            return (
              <ListItem button key={copy}>
                <ListItemIcon>
                  <Link href={href}>{icon}</Link>
                </ListItemIcon>
                <ListItemText primary={copy} />
              </ListItem>
            );
          })}
        </List>
      </div>
    );
  };

  return (
    <div>
      <React.Fragment>
        <Button onClick={() => setIsOpen(true)}>
          <SiteLogo />
        </Button>
        <Drawer anchor={"left"} open={isOpen} onClose={() => setIsOpen(false)}>
          <Typography variant="h6" className={classes.drawerLogo}>
            WKDash
          </Typography>
          <Divider />
          {list()}
          {apiKey && (
            <>
              <Divider />
              <ListItem
                button
                key={"removeapikey"}
                onClick={() => console.log("remove api key")}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary={"Remove api key"} />
              </ListItem>
            </>
          )}
        </Drawer>
      </React.Fragment>
    </div>
  );
};

const SiteLogo = () => {
  const classes = useSiteLogoStyles();
  return (
    <Box className={classes.siteLogoContainer}>
      <Typography variant="h6" className={classes.siteLogo}>
        WKDash
      </Typography>
    </Box>
  );
};

export const WKDashAppBar: React.FC<WKDashAppBarProps> = () => {
  const classes = useStyles();
  const { pathname } = useRouter();
  const { width } = useWindowSize();
  const savedApiKey =
    isClientSide() && localStorage.getItem(API_KEY_LOCAL_STORAGE);
  const [apiKey, setApiKey] = useState(savedApiKey || undefined);
  const [anchorEl, setAnchorEl] = React.useState<
    null | (EventTarget & HTMLButtonElement)
  >(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleRemoveApiKey = () => {
    setApiKey(undefined);
    setAnchorEl(null);
    // clear storage operation
  };
  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar variant="dense">
        {width > 600 ? (
          <>
            <Link href="/">
              <SiteLogo />
            </Link>
            <Box className={classes.linkBox}>
              {Object.values(NAV_ARR).map((linkEntry, i) => {
                return (
                  <Box className={classes.link} key={i}>
                    <Link href={linkEntry.href}>
                      <Typography
                        variant="body1"
                        className={clsx({
                          [classes.linkTextUnderline]:
                            pathname === linkEntry.href,
                        })}
                      >
                        {linkEntry.copy}
                      </Typography>
                    </Link>
                  </Box>
                );
              })}
              <Box className={classes.stop} />
            </Box>
            {apiKey && (
              <>
                <Avatar className={classes.small}>
                  <IconButton
                    className={classes.colorDefault}
                    aria-controls="settings-menu"
                    aria-haspopup="true"
                    onClick={handleClick}
                  >
                    <SettingsIcon className={classes.colorPrimary} />
                  </IconButton>
                </Avatar>
                <Menu
                  id="settings-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleRemoveApiKey}>
                    Remove ApiKey
                  </MenuItem>
                </Menu>
              </>
            )}
          </>
        ) : (
          <MobileNavMenu apiKey={apiKey} />
        )}
      </Toolbar>
    </AppBar>
  );
};

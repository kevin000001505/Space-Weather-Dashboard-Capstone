import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import TopBar from "../charts/TopBar";
import { useDispatch, useSelector } from "react-redux";
import RightContentsNav from "./sections/RightNav";
import {
  defaultHelpTopic,
  getHelpGroupForTopic,
  getHelpGroupSlug,
  getHelpTopicFromSlug,
  getHelpTopicPath,
  helpGroupLabels,
  pageContent,
  TOPBAR_HEIGHT,
} from "./helpers/constants";
import LeftTopicsNav from "./sections/LeftNav";
import MainContent from "./sections/MainContent";
import {
  paletteDarkMode,
  paletteLightMode,
  typographyTheme,
} from "./helpers/themes";
import { Navigate, useParams } from "react-router-dom";
import {
  setActiveAnchor,
  setActiveTopic,
  setOpenGroups,
} from "../../store/slices/helpSlice";

export default function Help() {
  const dispatch = useDispatch();
  const { groupSlug, topicSlug } = useParams();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const { activeTopic } = useSelector((state) => state.help);
  const observerRef = useRef(null);
  const theme = useMemo(
    () =>
      createTheme({
        palette: darkMode ? paletteDarkMode : paletteLightMode,
        shape: {
          borderRadius: 10,
        },
        typography: typographyTheme,
      }),
    [darkMode],
  );

  const selectedTopic = topicSlug ? getHelpTopicFromSlug(topicSlug) : defaultHelpTopic;
  const selectedGroup = selectedTopic
    ? getHelpGroupForTopic(selectedTopic)
    : null;
  const canonicalPath = selectedTopic ? getHelpTopicPath(selectedTopic) : "/help";

  if (!topicSlug || !selectedTopic || !selectedGroup) {
    return <Navigate replace to={canonicalPath} />;
  }

  if (getHelpGroupSlug(selectedGroup) !== groupSlug) {
    return <Navigate replace to={canonicalPath} />;
  }

  const article = pageContent[selectedTopic];
  const flatContents = useMemo(
    () =>
      article.sections.flatMap((section) => [
        { id: section.id, title: section.title, level: 2 },
        ...section.subsections.map((sub) => ({
          id: sub.id,
          title: sub.title,
          level: 3,
        })),
      ]),
    [article],
  );

  useLayoutEffect(() => {
    if (activeTopic !== selectedTopic) {
      dispatch(setActiveTopic(selectedTopic));
    }
    const selectedGroup = getHelpGroupForTopic(selectedTopic);
    if (!selectedGroup) {
      return;
    }

    dispatch(
      setOpenGroups(
        Object.fromEntries(
          helpGroupLabels.map((group) => [group, group === selectedGroup]),
        ),
      ),
    );
  }, [activeTopic, dispatch, selectedTopic]);

  useEffect(() => {
    dispatch(setActiveAnchor(article.sections[0]?.id || "Overview"));
  }, [article, dispatch]);

  useEffect(() => {
    const ids = flatContents.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!elements.length) return undefined;

    observerRef.current?.disconnect?.();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          dispatch(setActiveAnchor(visible[0].target.id));
        }
      },
      {
        rootMargin: `-${TOPBAR_HEIGHT + 1}px 0px 0px 0px`,
        threshold: [0.5],
      },
    );

    elements.forEach((el) => observerRef.current.observe(el));

    return () => observerRef.current?.disconnect?.();
  }, [flatContents, activeTopic, dispatch]);

  return (
    <>
      <TopBar />
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            height: `calc(100vh)`,
            overflow: "hidden",
            bgcolor: "background.default",
            color: "text.primary",
          }}
        >
          <Box
            sx={{
              minHeight: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
              display: "flex",
              alignItems: "start",
              justifyContent: "center",
              pt: `${TOPBAR_HEIGHT}px`,
            }}
          >
            <LeftTopicsNav />

            <MainContent article={article} />

            <RightContentsNav sections={flatContents} />
          </Box>
        </Box>
      </ThemeProvider>
    </>
  );
}

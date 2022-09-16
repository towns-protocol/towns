import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  QueryMatch,
  TypeaheadOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";

import fuzzysort from "fuzzysort";
import { $createTextNode, TextNode } from "lexical";
import { RoomMember } from "matrix-js-sdk";
import * as React from "react";
import { useCallback, useState } from "react";
import * as ReactDOM from "react-dom";
import { Avatar, Box, Stack, Text } from "@ui";
import { notUndefined } from "ui/utils/utils";
import { $createMentionNode } from "../nodes/MentionNode";
import { LexicalTypeaheadMenuPlugin } from "./LexicalTypeaheadPlugin";

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

type Props = {
  members: RoomMember[];
};

export const NewMentionsPlugin = (props: Props) => {
  const [editor] = useLexicalComposerContext();

  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = props.members
    .map((m) =>
      m.user?.displayName
        ? new MentionTypeaheadOption(m.user?.displayName, m.user?.avatarUrl)
        : undefined,
    )
    .filter(notUndefined);

  const results = fuzzysort
    .go(queryString || "", options, {
      key: "name",
    })
    .map((r) => r.obj)
    .slice(0, SUGGESTION_LIST_LENGTH_LIMIT);

  const onSelectOption = useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(`@${selectedOption.name}`);
        const spaceNode = $createTextNode(" ");

        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }

        mentionNode.insertAfter(spaceNode);
        spaceNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const mentionMatch = getPossibleQueryMatch(text);
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      return !slashMatch && mentionMatch ? mentionMatch : null;
    },
    [checkForSlashTriggerMatch, editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      triggerFn={checkForMentionMatch}
      options={results}
      menuRenderFn={(
        anchorElement,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchorElement && options.length
          ? ReactDOM.createPortal(
              <Box border position="relative">
                <Stack
                  border
                  style={{ bottom: 0 }}
                  overflow="hidden"
                  position="absolute"
                  rounded="sm"
                  minWidth="250"
                  as="ul"
                >
                  {results.map((option, i: number) => (
                    <MentionsTypeaheadMenuItem
                      index={i}
                      isLast={results.length - 1 === i}
                      isSelected={selectedIndex === i}
                      key={option.key}
                      option={option}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                    />
                  ))}
                </Stack>
              </Box>,
              anchorElement,
            )
          : null
      }
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
    />
  );
};

const MentionsTypeaheadMenuItem = (props: {
  index: number;
  isSelected: boolean;
  isLast?: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: MentionTypeaheadOption;
}) => {
  const { index, isLast, isSelected, onClick, onMouseEnter, option } = props;

  return (
    <Stack
      horizontal
      gap
      padding="sm"
      as="li"
      background={isSelected ? "level4" : "level2"}
      borderBottom={isLast ? undefined : "default"}
      key={option.key}
      tabIndex={-1}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <Box width="x3">
        {option.picture && <Avatar size="avatar_sm" src={option.picture} />}
      </Box>
      <Box justifyContent="center">
        <Text truncate>{option.name}</Text>
      </Box>
    </Stack>
  );
};

const PUNCTUATION =
  "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
const NAME = "\\b[A-Z][^\\s" + PUNCTUATION + "]";

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION,
};

export const CapitalizedNameMentionsRegex = new RegExp(
  "(^|[^#])((?:" + DocumentMentionsRegex.NAME + "{" + 1 + ",})$)",
);

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ["@"].join("");

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = "[^" + TRIGGERS + PUNC + "\\s]";

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  "(?:" +
  "\\.[ |$]|" + // E.g. "r. " in "Mr. Smith"
  " |" + // E.g. " " in "Josh Duck"
  "[" +
  PUNC +
  "]|" + // E.g. "-' in "Salier-Hellendag"
  ")";

const LENGTH_LIMIT = 75;

export const AtSignMentionsRegex = new RegExp(
  "(^|\\s|\\()(" +
    "[" +
    TRIGGERS +
    "]" +
    "((?:" +
    VALID_CHARS +
    VALID_JOINS +
    "){0," +
    LENGTH_LIMIT +
    "})" +
    ")$",
);

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50;

// Regex used to match alias.
export const AtSignMentionsRegexAliasRegex = new RegExp(
  "(^|\\s|\\()(" +
    "[" +
    TRIGGERS +
    "]" +
    "((?:" +
    VALID_CHARS +
    "){0," +
    ALIAS_LENGTH_LIMIT +
    "})" +
    ")$",
);

const checkForCapitalizedNameMentions = (
  text: string,
  minMatchLength: number,
): QueryMatch | null => {
  const match = CapitalizedNameMentionsRegex.exec(text);
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];

    const matchingString = match[2];
    if (matchingString != null && matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: matchingString,
      };
    }
  }
  return null;
};

const checkForAtSignMentions = (
  text: string,
  minMatchLength: number,
): QueryMatch | null => {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];

    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
};

const getPossibleQueryMatch = (text: string): QueryMatch | null => {
  const match = checkForAtSignMentions(text, 1);
  return match === null ? checkForCapitalizedNameMentions(text, 3) : match;
};

class MentionTypeaheadOption extends TypeaheadOption {
  name: string;
  picture: string | undefined;

  constructor(name: string, picture: string | undefined) {
    super(name);
    this.name = name;
    this.picture = picture;
  }
}

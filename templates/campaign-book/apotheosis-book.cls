%% apotheosis-book.cls
%% A campaign book class in the style of the official fifth edition
%% paperbacks, with a darker, aged tone and art that fades into the page.
%%
%% Carries over the features of the Dragonbane Supplement class (part pages
%% with art, segments, dragon/demon/empty/table boxes, coloured list items,
%% \partcolor, credits, black & white printing) and the D&D 5e LaTeX template
%% (read-aloud text, sidebars, comments, tables, stat blocks, spell headers,
%% drop caps, keyed areas). The D&D and rpg-monster command names still work.
%%
%% Compile with XeLaTeX or LuaLaTeX (fontspec). All fonts ship with TeX Live.
%%
%% This work may be distributed and/or modified under the conditions of the
%% LaTeX Project Public License, version 1.3c or later.

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{apotheosis-book}[2026/10/27 v1.1 D&D paperback style campaign book]

%% ========================================================================
%% OPTIONS
%% ========================================================================
%   (default)    aged parchment pages, full colour
%   print        plain white pages, no textures (printer friendly)
%   blackwhite   alias of print, kept for Dragonbane compatibility
%   onecolumn    single column body (two columns by default)
%   framedart    leave \includegraphics in figures as plain, hard-edged images
%   a4paper / letterpaper (default)
\newif\ifapo@print \apo@printfalse
\newif\ifapo@twocol \apo@twocoltrue
\newif\ifapo@blendfigs \apo@blendfigstrue
\def\apo@paper{letterpaper}
\DeclareOption{print}{\apo@printtrue}
\DeclareOption{blackwhite}{\apo@printtrue}
\DeclareOption{onecolumn}{\apo@twocolfalse}
\DeclareOption{framedart}{\apo@blendfigsfalse}
\DeclareOption{twocolumn}{\apo@twocoltrue}
\DeclareOption{a4paper}{\def\apo@paper{a4paper}}
\DeclareOption{letterpaper}{\def\apo@paper{letterpaper}}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{book}}
\ProcessOptions\relax
\ifapo@twocol
  \LoadClass[10pt,twoside,openany,twocolumn]{book}
\else
  \LoadClass[10pt,twoside,openany]{book}
\fi

%% ========================================================================
%% PACKAGES
%% ========================================================================
\RequirePackage{iftex}
\ifTUTeX\else
  \ClassError{apotheosis-book}{Compile with XeLaTeX or LuaLaTeX}
    {This class uses fontspec. Switch the compiler to XeLaTeX.}
\fi
\RequirePackage[\apo@paper,
  top=0.7in, bottom=0.95in, inner=0.6in, outer=0.6in,
  headsep=0pt, headheight=0pt, footskip=0.45in]{geometry}
\RequirePackage[english]{babel}
\RequirePackage[autostyle]{csquotes}
\RequirePackage{fontspec}
\RequirePackage{microtype}
\RequirePackage[table,dvipsnames]{xcolor}
\RequirePackage{graphicx}
\let\apo@includegraphics\includegraphics
\RequirePackage{tikz}
\usetikzlibrary{fadings,calc}
\RequirePackage[most]{tcolorbox}
\RequirePackage{multicol}
\RequirePackage{enumitem}
\RequirePackage{tabularx,array}
\RequirePackage{xstring}
\RequirePackage{titlesec,titletoc}
\RequirePackage{fancyhdr}
\RequirePackage{lettrine}
\RequirePackage{Royal}
\RequirePackage{pagecolor}
\RequirePackage{ragged2e}
\RequirePackage[hidelinks]{hyperref}

\setlength{\columnsep}{0.32in}
\setlength{\parindent}{1em}
\setlength{\parskip}{0pt}
\raggedbottom

%% ========================================================================
%% FONTS
%% ========================================================================
% Body: TeX Gyre Bonum (the Bookman face behind the 5e body text).
% Headings: Bonum small caps, as in the D&D 5e LaTeX template.
% Tables, stat block labels: Gillius ADF No2 (a Gill Sans cut, like the
% sans used in the books).  Drop caps: Royal initials, as in the D&D 5e
% LaTeX template.
\setmainfont{texgyrebonum}[
  Extension = .otf, UprightFont = *-regular, BoldFont = *-bold,
  ItalicFont = *-italic, BoldItalicFont = *-bolditalic, Scale = 0.94]
\setsansfont{GilliusADFNo2Cond}[
  Extension = .otf, UprightFont = *-Regular, BoldFont = *-Bold,
  ItalicFont = *-Italic, BoldItalicFont = *-BoldItalic, Scale = 1.05]
\newfontfamily\displayfont{texgyrebonum}[
  Extension = .otf, UprightFont = *-regular, BoldFont = *-bold,
  Letters = SmallCaps]
% Dragonbane compatibility
\newcommand{\titlefont}{\displayfont}
\newcommand{\tffamily}{\displayfont}

%% ========================================================================
%% COLOURS
%% ========================================================================
% The D&D 5e LaTeX template palette, plus darker part colours for the
% grimmer tone of this campaign.
\definecolor{titlered}{HTML}{58180D}     % titles
\definecolor{titlegold}{HTML}{C9AD6A}    % title rules
\definecolor{rulered}{HTML}{9C2B1B}      % stat block rules
\definecolor{pagegold}{HTML}{B89A67}     % page numbers, footer
\definecolor{bgtan}{HTML}{F7F2E5}        % read-aloud
\definecolor{statblockribbon}{HTML}{E69A28}
\definecolor{statblockbg}{HTML}{FDF1DC}
\definecolor{ink}{HTML}{1E1A16}
\definecolor{PhbLightGreen}{HTML}{E0E5C1}
\definecolor{PhbLightCyan}{HTML}{B5CEB8}
\definecolor{PhbMauve}{HTML}{DCCCC5}
\definecolor{PhbTan}{HTML}{E5D5AC}
\definecolor{DmgLavender}{HTML}{E3CED3}
\definecolor{DmgCoral}{HTML}{F3D7C1}
\definecolor{DmgSlateGray}{HTML}{DBE4E4}
\definecolor{DmgLilac}{HTML}{D7D4D6}
\definecolor{AshGray}{HTML}{D6D0C4}      % grim extras
\definecolor{Bloodwash}{HTML}{E2C4BC}
% The theme colour fills sidebars, comments and table stripes. Change it
% per part with \partcolor{<colour>} or \DndSetThemeColor[<colour>].
\colorlet{themecolor}{PhbMauve}
\colorlet{accent}{titlered}               % headings, labels
\colorlet{secret}{rulered}
\newcommand{\setthemecolor}[1]{\colorlet{themecolor}{#1}}
\newcommand{\partcolor}[1]{\clearpage\setthemecolor{#1}}
\NewDocumentCommand{\DndSetThemeColor}{o}{\IfValueTF{#1}{\setthemecolor{#1}}{\setthemecolor{PhbLightGreen}}}
\ifapo@print
  \definecolor{pagecolour}{HTML}{FFFFFF}
\else
  \definecolor{pagecolour}{HTML}{EEE5CE}
\fi
\pagecolor{pagecolour}
\AtBeginDocument{\color{ink}}

%% ========================================================================
%% PAGE GROUND
%% ========================================================================
% Aged parchment with darkened edges behind every page.
\newcommand{\apo@pageground}{%
  \ifapo@print\else
    \put(0,0){\begin{tikzpicture}[overlay]
      \node[inner sep=0pt, anchor=north west] at (0,0)
        {\includegraphics[width=\paperwidth,height=\paperheight]{apo-paper.jpg}};
    \end{tikzpicture}}%
  \fi}
\AddToHook{shipout/background}{\apo@pageground}

%% ========================================================================
%% FADED ART
%% ========================================================================
% \fadedart[keys]{file} draws an image cropped to width x height whose edges
% dissolve into the page behind it, like the art in the official books.
%
%   width=<len>        default \linewidth
%   height=<len>       default: keep the image's aspect ratio
%   fade=soft|all|bottom|top|sides|left|right|none   preset (default soft)
%   top/bottom/left/right=<0..0.5>   fade depth as a fraction of the size
%   focus=<0..1>       vertical crop focus: 0 top, .5 centre, 1 bottom
%   opacity=<0..1>     overall strength (default 1)
\pgfdeclareverticalshading{apo@edge}{100bp}{%
  color(0bp)=(white); color(25bp)=(white);
  color(37.5bp)=(black!16); color(50bp)=(black!50);
  color(62.5bp)=(black!84); color(75bp)=(black); color(100bp)=(black)}
\pgfkeys{/apo/art/.is family, /apo/art,
  width/.store in=\apo@aw, height/.store in=\apo@ah,
  top/.store in=\apo@ft, bottom/.store in=\apo@fb,
  left/.store in=\apo@fl, right/.store in=\apo@fr,
  focus/.store in=\apo@focus, opacity/.store in=\apo@aop,
  fade/.is choice,
  fade/none/.style   ={top=0, bottom=0, left=0, right=0},
  fade/soft/.style   ={top=.16, bottom=.2, left=.16, right=.16},
  fade/all/.style    ={top=.28, bottom=.3, left=.28, right=.28},
  fade/bottom/.style ={top=0, bottom=.5, left=0, right=0},
  fade/top/.style    ={top=.5, bottom=0, left=0, right=0},
  fade/sides/.style  ={top=0, bottom=0, left=.25, right=.25},
  fade/left/.style   ={top=.12, bottom=.16, left=.45, right=0},
  fade/right/.style  ={top=.12, bottom=.16, left=0, right=.45},
  reset/.style={width=\linewidth, height=, fade=soft, focus=.5, opacity=1},
}
% Build (once) a 10cm x 10cm soft mask for a given set of edge depths.
\newcommand{\apo@makefading}[1]{%
  \ifcsname apo@fading@#1\endcsname\else
    \expandafter\gdef\csname apo@fading@#1\endcsname{}%
    \begin{tikzfadingfrompicture}[name=#1]
      \fill[white] (-5cm,-5cm) rectangle (5cm,5cm);
      \begin{scope}[blend mode=multiply]
        \ifdim\apo@ft pt>0pt
          \shade[shading=apo@edge] (-5cm,5cm) rectangle (5cm,{5cm-10cm*\apo@ft});\fi
        \ifdim\apo@fb pt>0pt
          \shade[shading=apo@edge,shading angle=180] (-5cm,-5cm) rectangle (5cm,{-5cm+10cm*\apo@fb});\fi
        \ifdim\apo@fl pt>0pt
          \shade[shading=apo@edge,shading angle=90] (-5cm,-5cm) rectangle ({-5cm+10cm*\apo@fl},5cm);\fi
        \ifdim\apo@fr pt>0pt
          \shade[shading=apo@edge,shading angle=270] ({5cm-10cm*\apo@fr},-5cm) rectangle (5cm,5cm);\fi
      \end{scope}
    \end{tikzfadingfrompicture}%
  \fi}
\newsavebox{\apo@artbox}
\newlength{\apo@W}\newlength{\apo@H}
\NewDocumentCommand{\fadedart}{O{} m}{%
  \begingroup
  \pgfkeys{/apo/art/.cd, reset,#1}%
  \sbox\apo@artbox{\apo@includegraphics{#2}}%
  \setlength{\apo@W}{\apo@aw}%
  \ifx\apo@ah\@empty
    \setlength{\apo@H}{\dimexpr\apo@W*\ht\apo@artbox/\wd\apo@artbox\relax}%
  \else
    \setlength{\apo@H}{\apo@ah}%
  \fi
  % Scale to cover the box, then crop.
  \pgfmathsetmacro{\apo@sc}{max(\apo@W/\wd\apo@artbox, \apo@H/\ht\apo@artbox)}%
  \pgfmathsetmacro{\apo@iw}{\wd\apo@artbox*\apo@sc}%
  \pgfmathsetmacro{\apo@ih}{\ht\apo@artbox*\apo@sc}%
  \pgfmathsetmacro{\apo@dy}{(\apo@ih-\apo@H)*(\apo@focus-.5)}%
  \edef\apo@fname{apofade-\apo@ft-\apo@fb-\apo@fl-\apo@fr}%
  \expandafter\apo@makefading\expandafter{\apo@fname}%
  \begin{tikzpicture}[inner sep=0pt]
    \useasboundingbox (0,0) rectangle (\apo@W,\apo@H);
    \begin{pgfscope}
      \pgfsetfading{\apo@fname}{%
        \pgftransformshift{\pgfpoint{.5\apo@W}{.5\apo@H}}%
        \pgftransformxscale{\apo@W/10cm}\pgftransformyscale{\apo@H/10cm}}%
      \pgfsetfillopacity{\apo@aop}%
      % A transparency group, so PNGs with their own alpha still fade.
      \begin{pgftransparencygroup}
        \pgfpathrectangle{\pgfpointorigin}{\pgfpoint{\apo@W}{\apo@H}}%
        \pgfusepath{clip}%
        \pgftext[at={\pgfpoint{.5\apo@W}{.5\apo@H+\apo@dy pt}}]{%
          \apo@includegraphics[width=\apo@iw pt,height=\apo@ih pt]{#2}}%
      \end{pgftransparencygroup}
    \end{pgfscope}
  \end{tikzpicture}%
  \endgroup}

% Plain figures blend in too: inside a figure, \includegraphics draws a
% soft-edged \fadedart at the width it would have had. Turn this off with
% the framedart class option.
\newcommand{\apo@figart}[2][]{%
  \sbox\apo@artbox{\apo@includegraphics[#1]{#2}}%
  \edef\apo@figw{\the\wd\apo@artbox}%
  \fadedart[width=\apo@figw]{#2}}
\ifapo@blendfigs
  \AddToHook{env/figure/begin}{\let\includegraphics\apo@figart}
  \AddToHook{env/figure*/begin}{\let\includegraphics\apo@figart}
\fi

% In-column art. Soft edges on all sides; takes the same keys.
\NewDocumentCommand{\columnart}{O{} m}{%
  \par\vspace{4pt}\noindent\fadedart[#1]{#2}\par\vspace{4pt}}
\let\spotart\columnart

% Art painted directly onto the page, behind the text.
%  \pagetopart[keys]{file}     full-bleed band across the top, fades down
%  \pagebottomart[keys]{file}  full-bleed band across the bottom, fades up
% Both apply to the page that ships next, so call them at the top of the
% page they belong to.
\NewDocumentCommand{\pagetopart}{O{} m}{%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, top=0, bottom=.55, left=0, right=0, height=.4\paperheight,#1]{#2}}%
  \apo@placeart{top}}
\NewDocumentCommand{\pagebottomart}{O{} m}{%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, fade=top, height=.3\paperheight,#1]{#2}}%
  \apo@placeart{bottom}}
% Keep each placed art in its own box until its page ships, then paint it
% anchored to the top or bottom edge of the paper.
\newcount\apo@artcount
\newcommand{\apo@placeart}[1]{%
  \global\advance\apo@artcount\@ne
  \expandafter\newsavebox\csname apo@art@\the\apo@artcount\endcsname
  \expandafter\global\expandafter\setbox\csname apo@art@\the\apo@artcount\endcsname
    =\copy\apo@artbox
  \edef\apo@tmp{\noexpand\AddToHookNext{shipout/background}%
    {\noexpand\apo@putart{#1}{\the\apo@artcount}}}%
  \apo@tmp}
\newcommand{\apo@putart}[2]{%
  \def\apo@tmpa{#1}\def\apo@tmpb{top}%
  \ifx\apo@tmpa\apo@tmpb
    \put(0,0){\raisebox{-\height}{\expandafter\usebox\csname apo@art@#2\endcsname}}%
  \else
    \put(0,-\paperheight){\expandafter\usebox\csname apo@art@#2\endcsname}%
  \fi}

% A page that is only art, full bleed, with an optional caption.
\NewDocumentCommand{\fullpageart}{O{} m o}{%
  \clearpage\thispagestyle{empty}%
  \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
    top=.08, bottom=.2, left=.08, right=.08,#1]{#2}}%
  \apo@placeart{bottom}%
  \onecolumn@apo{\null\vfill
  \IfValueT{#3}{\begin{center}\itshape\large #3\end{center}}%
  \vspace*{0.2in}}\clearpage}
\newcommand{\onecolumn@apo}[1]{#1}

%% ========================================================================
%% HEADINGS
%% ========================================================================
\setcounter{secnumdepth}{0}
\setcounter{tocdepth}{1}
\newcommand{\thechapterhead}{\chaptername~\thechapter:}

% A gold rule under section titles, as in the books.
\newcommand{\goldrule}{\par\nointerlineskip\vspace{1pt}%
  {\color{titlegold}\hrule height 1.6pt}\par\nointerlineskip\vspace{3pt}}
\newcommand{\apo@ruledtitle}[1]{#1\goldrule}

% --- Chapters ----------------------------------------------------------
% \chapterart[keys]{file} before \chapter paints art across the top of the
% opening page, and the title sits in its faded lower edge.
\newif\ifapo@chapterart
\def\apo@chapterartfile{}\def\apo@chapterartkeys{}
\NewDocumentCommand{\chapterart}{O{} m}{%
  \gdef\apo@chapterartkeys{#1}\gdef\apo@chapterartfile{#2}\global\apo@chapterarttrue}
\newlength{\apo@chartheight}
\setlength{\apo@chartheight}{0.4\paperheight}
\newcommand{\apo@chapteropening}{%
  \ifapo@chapterart
    \edef\apo@tmp{\noexpand\pagetopart[height=\noexpand\apo@chartheight,
      \unexpanded\expandafter{\apo@chapterartkeys}]{\unexpanded\expandafter{\apo@chapterartfile}}}%
    \apo@tmp
    \vspace*{\dimexpr\apo@chartheight-0.7in-0.95in\relax}%
    \global\apo@chapterartfalse
  \fi}
\titleformat{\chapter}[block]
  {\apo@chapteropening\displayfont\color{titlered}\fontsize{30}{32}\selectfont\RaggedRight}
  {\thechapterhead}{0.3em}{}
\titleformat{name=\chapter,numberless}[block]
  {\apo@chapteropening\displayfont\color{titlered}\fontsize{30}{32}\selectfont\RaggedRight}
  {}{0pt}{}
\titlespacing*{\chapter}{0pt}{0pt}{14pt}

% --- Sections ----------------------------------------------------------
\titleformat{\section}
  {\displayfont\color{titlered}\fontsize{19}{20}\selectfont\RaggedRight}
  {}{0pt}{}[{\color{titlegold}\titlerule[1.6pt]}]
\titlespacing*{\section}{0pt}{10pt plus 3pt}{4pt}

\titleformat{\subsection}
  {\displayfont\color{titlered}\fontsize{14}{15}\selectfont\RaggedRight}
  {}{0pt}{}
\titlespacing*{\subsection}{0pt}{8pt plus 2pt}{2pt}

\titleformat{\subsubsection}
  {\displayfont\bfseries\color{titlered}\fontsize{11}{13}\selectfont\RaggedRight}
  {}{0pt}{}
\titlespacing*{\subsubsection}{0pt}{6pt plus 2pt}{1pt}

\titleformat{\paragraph}[runin]
  {\bfseries\itshape}{}{0pt}{}
\titlespacing*{\paragraph}{0pt}{3pt}{0.5em}

% --- Parts ---------------------------------------------------------------
% \partimage{file} sets full-bleed art for the next \part page.
\def\apo@partimage{}
\newcommand{\partimage}[1]{\gdef\apo@partimage{#1}}
\RenewDocumentCommand{\part}{s m}{%
  \if@twocolumn\onecolumn\@restonecoltrue\else\@restonecolfalse\fi
  \clearpage\thispagestyle{empty}%
  \IfBooleanF{#1}{\refstepcounter{part}\addcontentsline{toc}{part}{#2}}%
  \ifx\apo@partimage\@empty\else
    \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
      top=.06, bottom=.45, left=.06, right=.06, focus=.35]{\apo@partimage}}%
    \apo@placeart{bottom}%
    \gdef\apo@partimage{}%
  \fi
  \null\vfill
  \begin{center}
    \IfBooleanF{#1}{{\displayfont\large\color{titlered}\partname~\thepart\par}\vspace{4pt}}%
    {\displayfont\fontsize{40}{44}\selectfont\color{titlered}#2\par}
    \vspace{6pt}{\color{titlegold}\rule{0.4\textwidth}{1.6pt}}
  \end{center}
  \vspace*{0.6in}
  \clearpage
  \if@restonecol\twocolumn\fi}

%% ========================================================================
%% TABLE OF CONTENTS
%% ========================================================================
\renewcommand{\contentsname}{Contents}
\titlecontents{part}[0pt]
  {\addvspace{10pt}\displayfont\large\color{titlered}}
  {}{}{}[\addvspace{3pt}]
\titlecontents{chapter}[0pt]
  {\addvspace{6pt}\displayfont\color{titlered}\bfseries}
  {\thecontentslabel.\ }{}{\hfill\contentspage}
\titlecontents{section}[1em]
  {}{}{}{\titlerule*[0.5pc]{.}\contentspage}

%% ========================================================================
%% RUNNING FEET
%% ========================================================================
% The gold scroll across the foot of every page, the page number at the
% outer corner, and the chapter name beside it.
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\chaptermark}[1]{\markboth{#1}{#1}}
\newif\ifapo@scroll \apo@scrolltrue
\newcommand{\apo@scroll}[1]{%
  \ifapo@scroll
    \begin{tikzpicture}[remember picture, overlay]
      \node[inner sep=0pt, anchor=south, opacity=.85, xscale=#1] at (current page.south)
        {\includegraphics[width=\paperwidth,height=.6in]{apo-footerscroll.pdf}};
    \end{tikzpicture}%
  \fi}
\newcommand{\apo@footfont}{\sffamily\footnotesize\color{pagegold}}
\fancyfoot[LE]{\apo@scroll{-1}\apo@footfont\bfseries\thepage\hspace{1.2em}\mdseries\MakeUppercase{\apo@shorttitle}}
\fancyfoot[RO]{\apo@scroll{1}\apo@footfont\MakeUppercase{\leftmark}\hspace{1.2em}\bfseries\thepage}
\fancypagestyle{plain}{\fancyhf{}%
  \fancyfoot[LE]{\apo@scroll{-1}\apo@footfont\bfseries\thepage}%
  \fancyfoot[RO]{\apo@scroll{1}\apo@footfont\bfseries\thepage}}

%% ========================================================================
%% TITLE PAGE & CREDITS
%% ========================================================================
\def\@subtitle{}\def\@credits{}\def\@version{}\def\apo@cover{}\def\apo@logo{}
\newcommand{\subtitle}[1]{\gdef\@subtitle{#1}}
\newcommand{\credits}[1]{\gdef\@credits{#1}}
\newcommand{\version}[1]{\gdef\@version{#1}}
\newcommand{\coverimage}[1]{\gdef\apo@cover{#1}}
% Title used in the running foot (defaults to \title without line breaks).
\def\apo@shorttitle{{\def\\{ }\let\large\relax\let\Large\relax\let\small\relax\@title}}
\newcommand{\shorttitle}[1]{\gdef\apo@shorttitle{#1}}
\newcommand{\logo}[1]{\gdef\apo@logo{#1}}
\newcommand{\authorkey}{Written by}
\newcommand{\creditskey}{Credits}

\renewcommand*{\maketitle}{%
  \begin{titlepage}
    \ifx\apo@cover\@empty\else
      \sbox\apo@artbox{\fadedart[width=\paperwidth, height=\paperheight,
        top=.04, bottom=.42, left=.04, right=.04, focus=.15]{\apo@cover}}%
      \apo@placeart{bottom}%
    \fi
    \null\vfill
    \begin{center}
      \ifx\apo@logo\@empty
        {\displayfont\fontsize{60}{62}\selectfont\color{titlered}\@title\par}
      \else
        \includegraphics[width=0.42\textwidth]{\apo@logo}\par
      \fi
      \vspace{6pt}{\color{titlegold}\rule{0.5\textwidth}{1.6pt}}\par
      \ifx\@subtitle\@empty\else
        \vspace{6pt}{\Large\itshape\color{titlered}\@subtitle\par}
      \fi
      \vspace{10pt}{\displayfont\large\@author\par}
      \ifx\@version\@empty\else
        \vspace{2pt}{\small Version \@version\par}
      \fi
    \end{center}
    \vspace*{0.4in}
  \end{titlepage}}

% \makecredits: a credits page (Dragonbane's title block, moved inside).
\newcommand{\makecredits}{%
  \if@twocolumn\onecolumn\@restonecoltrue\else\@restonecolfalse\fi
  \clearpage\thispagestyle{empty}%
  \null\vfill
  \begin{center}\begin{minipage}{0.6\textwidth}\centering\small
    {\displayfont\large\color{titlered}\authorkey\par}\vspace{2pt}
    \@author\par\vspace{12pt}
    \ifx\@credits\@empty\else
      {\displayfont\large\color{titlered}\creditskey\par}\vspace{2pt}
      {\setlength{\parskip}{0.5em}\@credits\par}
    \fi
  \end{minipage}\end{center}
  \vspace*{0.4in}\clearpage
  \if@restonecol\twocolumn\fi}

%% ========================================================================
%% LAYOUT: SEGMENTS
%% ========================================================================
% Dragonbane's segment. In the default two-column layout it only sets the
% optional section title; with onecolumn it opens a two-column block.
\ifapo@twocol
  \newenvironment{segment}[1][]{\ifx\relax#1\relax\else\section{#1}\fi}{}
\else
  \newenvironment{segment}[1][]{%
    \begin{multicols}{2}[\ifx\relax#1\relax\else\section{#1}\fi]}%
    {\end{multicols}}
\fi

%% ========================================================================
%% TEXT ELEMENTS
%% ========================================================================
% --- Drop caps (ornate initials, as in the books) ---
\renewcommand{\LettrineFontHook}{\Royal\color{titlered}}
\renewcommand{\LettrineTextFont}{\scshape}
\NewDocumentCommand{\dropcap}{O{} m m}{%
  \lettrine[lines=4, depth=0, findent=2pt, nindent=0pt,#1]{#2}{#3}}
\let\DndDropCapLine\dropcap

% --- Quote (Dragonbane's quote environment) ---
\renewenvironment{quote}
  {\par\medskip\begin{center}\begin{minipage}{0.9\linewidth}\centering
   \itshape\setlength{\parskip}{3pt}}
  {\end{minipage}\end{center}\medskip}
\newcommand{\quoteby}[1]{\par{\upshape\small --- #1}}

% --- Lists ---
\setlist[itemize]{noitemsep, topsep=3pt, leftmargin=1.2em, label=\textbullet}
\setlist[enumerate]{noitemsep, topsep=3pt, leftmargin=1.4em}
\setlist[description]{font=\bfseries\itshape, topsep=3pt, itemsep=1pt, leftmargin=0pt}
\newcommand\bolditem[1]{\item \textbf{#1}}
\newcommand\coloritem[2][titlered]{\item {\color{#1}\textbf{#2}}}
\newcommand\secretitem[1]{\item {\color{secret}\textbf{\itshape#1}}}

% --- Keyed areas (1. The Nave) ---
\newcounter{area}\newcounter{subarea}[area]
\newcommand{\areaprefix}{}
\NewDocumentCommand{\area}{m}{%
  \refstepcounter{area}\subsection{\areaprefix\thearea.~#1}}
\NewDocumentCommand{\subarea}{m}{%
  \refstepcounter{subarea}\subsubsection{\areaprefix\thearea\alph{subarea}.~#1}}
\let\DndArea\area\let\DndSubArea\subarea

%% ========================================================================
%% BOXES
%% ========================================================================
\tcbset{apo/base/.style={enhanced, breakable, sharp corners, boxrule=0pt,
  frame hidden, parbox=false, colupper=ink,
  before skip=10pt plus 3pt, after skip=10pt plus 3pt,
  before upper={\setlength{\parindent}{1em}\setlength{\parskip}{0pt}}}}

% Read-aloud text: tan panel, dark red bars on both sides, dotted corners.
\newtcolorbox{readaloud}[1][]{apo/base,
  colback=bgtan, boxsep=7pt, left=0pt, right=0pt, top=0pt, bottom=0pt,
  borderline west={1pt}{-0.5pt}{titlered},
  borderline east={1pt}{-0.5pt}{titlered},
  overlay={\foreach \n in {north east, north west, south east, south west}
    {\fill[titlered] (frame.\n) circle (1.5pt);}},
  fontupper=\itshape, #1}

% Sidebar (Dragonbane's dragonbox / D&D sidebar): theme-coloured panel,
% black rules with notched corners and a soft shadow.
\newtcolorbox{sidebar}[2][]{apo/base,
  colback=themecolor, boxsep=3pt, left=6pt, right=6pt, top=2pt, bottom=4pt,
  borderline north={1pt}{-0.5pt}{black}, borderline south={1pt}{-0.5pt}{black},
  fuzzy shadow={0mm}{-3.5pt}{-0.5pt}{0.4mm}{black!60!white},
  overlay={%
    \fill[black] (frame.south west) -- ++(7pt,0) -- ++(0,-5pt) -- cycle;
    \fill[black] (frame.north west) -- ++(7pt,0) -- ++(0,5pt) -- cycle;
    \fill[black] (frame.north east) -- ++(-7pt,0) -- ++(0,5pt) -- cycle;
    \fill[black] (frame.south east) -- ++(-7pt,0) -- ++(0,-5pt) -- cycle;},
  title={#2}, detach title, coltitle=ink, fontupper=\sffamily\small,
  before upper={\setlength{\parindent}{1em}\setlength{\parskip}{0pt}%
    {\noindent\sffamily\bfseries\scshape\large\tcbtitle\par}\vspace{2pt}},
  #1}

% Comment (D&D comment box): theme-coloured panel with a plain frame.
\newtcolorbox{commentbox}[2][]{apo/base,
  colback=themecolor, boxsep=4pt, left=6pt, right=6pt, top=2pt, bottom=4pt,
  borderline={0.6pt}{0pt}{black!70},
  title={#2}, detach title, coltitle=ink, fontupper=\sffamily\small,
  before upper={\setlength{\parindent}{1em}\setlength{\parskip}{0pt}%
    {\noindent\sffamily\bfseries\scshape\large\tcbtitle\par}\vspace{2pt}},
  #1}

% Variant rule (Dragonbane's demonbox): a sidebar in a blood wash.
\newtcolorbox{variantrule}[2][]{apo/base,
  colback=Bloodwash, boxsep=3pt, left=6pt, right=6pt, top=2pt, bottom=4pt,
  borderline north={1pt}{-0.5pt}{titlered}, borderline south={1pt}{-0.5pt}{titlered},
  fuzzy shadow={0mm}{-3.5pt}{-0.5pt}{0.4mm}{black!60!white},
  title={#2}, detach title, coltitle=ink, fontupper=\sffamily\small,
  before upper={\setlength{\parindent}{1em}\setlength{\parskip}{0pt}%
    {\noindent\sffamily\scshape\footnotesize\color{titlered}Variant Rule\par}%
    {\noindent\sffamily\bfseries\scshape\large\tcbtitle\par}\vspace{2pt}},
  #1}

% Note (Dragonbane's emptybox): no panel, a titled block between gold rules.
\newtcolorbox{note}[2][]{apo/base,
  colback=white, opacityback=0, boxsep=0pt, left=0pt, right=0pt, top=4pt, bottom=4pt,
  borderline north={1pt}{0pt}{titlegold}, borderline south={1pt}{0pt}{titlegold},
  title={#2}, detach title, coltitle=ink,
  before upper={\setlength{\parindent}{1em}\setlength{\parskip}{0pt}%
    {\noindent\displayfont\color{titlered}\large\tcbtitle\par}\vspace{1pt}},
  #1}

% Dragonbane and D&D names
\newenvironment{dragonbox}[2][]{\begin{sidebar}[#1]{#2}}{\end{sidebar}}
\newenvironment{demonbox}[2][]{\begin{variantrule}[#1]{#2}}{\end{variantrule}}
\newenvironment{emptybox}[2][]{\begin{note}[#1]{#2}}{\end{note}}
\newenvironment{DndReadAloud}[1][]{\begin{readaloud}}{\end{readaloud}}
\newenvironment{DndSidebar}[2][]{\begin{sidebar}{#2}}{\end{sidebar}}
\newenvironment{DndComment}[2][]{\begin{commentbox}{#2}}{\end{commentbox}}

%% ========================================================================
%% TABLES
%% ========================================================================
% \begin{rolltable}[Title]{colspec} ... \end{rolltable}
% Sans body, bold header row via \colhead, theme-coloured stripes.
\newcolumntype{L}{>{\RaggedRight\arraybackslash}X}
\newcolumntype{C}{>{\centering\arraybackslash}X}
\newcommand{\colhead}[1]{\leavevmode\textbf{#1}}
\newcommand{\apo@tablestart}[1]{%
  \par\addvspace{6pt}\noindent
  \minipage{\linewidth}%
  \ifx\relax#1\relax\else{\sffamily\bfseries\scshape\large #1\par}\vspace{2pt}\fi
  \sffamily\small\renewcommand{\arraystretch}{1.15}%
  \rowcolors{2}{themecolor}{}}
\newcommand{\apo@tableend}{\endminipage\par\addvspace{6pt}}
\newenvironment{rolltable}[2][]
  {\apo@tablestart{#1}\tabularx{\linewidth}{@{\hspace{3pt}}#2@{\hspace{3pt}}}}
  {\endtabularx\apo@tableend}
\newenvironment{DndTable}[2][]
  {\def\apo@dthead{}\pgfkeys{/apo/dndtable/.cd,#1}%
   \expandafter\apo@tablestart\expandafter{\apo@dthead}%
   \tabularx{\linewidth}{@{\hspace{3pt}}#2@{\hspace{3pt}}}}
  {\endtabularx\apo@tableend}
\pgfkeys{/apo/dndtable/.cd, header/.store in=\apo@dthead,
  color/.code={\rowcolors{2}{#1}{}}, width/.code={}, float/.code={}}

% Dragonbane: \begin{tablebox}{Title} <any tabular> \end{tablebox}
\newenvironment{tablebox}[2][]
  {\par\addvspace{6pt}\noindent{\sffamily\bfseries\scshape\large #2\par}\vspace{2pt}%
   \centering\sffamily\small\renewcommand{\arraystretch}{1.15}\rowcolors{2}{themecolor}{}}
  {\par\addvspace{6pt}}
\newenvironment{pagetable}[2][]{\begin{tablebox}[#1]{#2}}{\end{tablebox}}
\newcommand*{\bline}{\noalign{\hrule height 0.6pt}}

%% ========================================================================
%% STAT BLOCKS
%% ========================================================================
% \begin{monster}{Name} \monstertype{Large monstrosity, unaligned}
%   \basics[...] \stats[...] \details[...]  actions...  \end{monster}
% Same keys as the rpg-monster package used in the Apotheosis notes.
\newcommand\armorclassname{Armor Class}
\newcommand\hitpointsname{Hit Points}
\newcommand\speedname{Speed}
\newcommand\skillsname{Skills}
\newcommand\dimmname{Damage Immunities}
\newcommand\dvulname{Damage Vulnerabilities}
\newcommand\dresname{Damage Resistances}
\newcommand\cimmname{Condition Immunities}
\newcommand\savesname{Saving Throws}
\newcommand\sensesname{Senses}
\newcommand\languagesname{Languages}
\newcommand\challengename{Challenge}

% The tapering red rule of the stat blocks.
\newcommand{\monsterrule}{\par\nointerlineskip\vspace{3pt}\noindent
  \tikz\fill[rulered] (0,0) -- (0,1.2pt) -- (\linewidth,0.6pt) -- cycle;%
  \par\nointerlineskip\vspace{3pt}}
\let\rpghline\monsterrule
\let\dndline\monsterrule

\newtcolorbox{monster}[2][]{apo/base,
  colback=statblockbg, boxsep=0pt, left=7pt, right=7pt, top=8pt, bottom=8pt,
  borderline north={4pt}{0pt}{titlered},
  borderline north={2.5pt}{0.75pt}{statblockribbon},
  borderline south={4pt}{0pt}{titlered},
  borderline south={2.5pt}{0.75pt}{statblockribbon},
  fuzzy shadow={0mm}{-2pt}{0pt}{0.4mm}{black!40!white},
  title={#2}, detach title, coltitle=ink, fontupper=\sffamily\small,
  before upper={\setlength{\parindent}{0pt}\setlength{\parskip}{3pt}%
    {\displayfont\bfseries\color{titlered}\fontsize{17}{18}\selectfont\tcbtitle\par}},
  #1}
\newenvironment{monsterbox}[2][]{\begin{monster}[#1]{#2}}{\end{monster}}
\newenvironment{DndMonster}[2][]{\begin{monster}{#2}}{\end{monster}}
\newcommand{\monstertype}[1]{{\itshape#1\par}\monsterrule}

\newcommand{\apo@attr}[2]{%
  \ifx#2\@empty\else
    \par\vspace{-2pt}\noindent\hangindent=1em{\color{titlered}\textbf{#1}}~{\color{titlered}#2}\par
  \fi}
% Each key stores into \apo@m@<name>. A bare piece without "=" (as in
% "skills = Athletics +10, Religion +2") is added back onto the previous
% key, so comma lists written for rpg-monster keep working.
\pgfkeys{/apo/mon/.is family,
  /apo/mon/store/.style={/apo/mon/#1/.code={%
    \expandafter\def\csname apo@m@#1\endcsname{##1}\def\apo@m@last{#1}}},
  /apo/mon/store/.list={armorclass,hitpoints,speed,STR,DEX,CON,INT,WIS,CHA,
    skills,savingthrows,damagevulnerabilities,damageresistances,
    damageimmunities,conditionimmunities,senses,languages,challenge},
  /apo/mon/.unknown/.code={%
    \ifx\apo@m@last\@undefined\else
      \expandafter\let\expandafter\apo@tmpv\csname apo@m@\apo@m@last\endcsname
      \expandafter\edef\csname apo@m@\apo@m@last\endcsname{%
        \unexpanded\expandafter{\apo@tmpv}, \pgfkeyscurrentname}%
    \fi}}
\NewDocumentCommand{\basics}{O{}}{%
  \pgfkeys{/apo/mon/.cd, armorclass=, hitpoints=, speed=,#1}%
  \apo@attr{\armorclassname}{\apo@m@armorclass}%
  \apo@attr{\hitpointsname}{\apo@m@hitpoints}%
  \apo@attr{\speedname}{\apo@m@speed}}
\NewDocumentCommand{\stats}{O{}}{%
  \pgfkeys{/apo/mon/.cd, STR=\stat{10}, DEX=\stat{10}, CON=\stat{10},
    INT=\stat{10}, WIS=\stat{10}, CHA=\stat{10},#1}%
  \par\noindent
  {\setlength{\tabcolsep}{0pt}\color{titlered}%
   \begin{tabular*}{\linewidth}{@{\extracolsep{\fill}}cccccc@{}}
     \textbf{STR}&\textbf{DEX}&\textbf{CON}&\textbf{INT}&\textbf{WIS}&\textbf{CHA}\\
     \apo@m@STR&\apo@m@DEX&\apo@m@CON&\apo@m@INT&\apo@m@WIS&\apo@m@CHA
   \end{tabular*}}\par}
\NewDocumentCommand{\details}{O{}}{%
  \pgfkeys{/apo/mon/.cd, skills=, savingthrows=, damagevulnerabilities=,
    damageresistances=, damageimmunities=, conditionimmunities=,
    senses=---, languages=---, challenge=,#1}%
  \apo@attr{\savesname}{\apo@m@savingthrows}%
  \apo@attr{\skillsname}{\apo@m@skills}%
  \apo@attr{\dvulname}{\apo@m@damagevulnerabilities}%
  \apo@attr{\dresname}{\apo@m@damageresistances}%
  \apo@attr{\dimmname}{\apo@m@damageimmunities}%
  \apo@attr{\cimmname}{\apo@m@conditionimmunities}%
  \apo@attr{\sensesname}{\apo@m@senses}%
  \apo@attr{\languagesname}{\apo@m@languages}%
  \ifx\apo@m@challenge\@empty\else
    \apo@attr{\challengename}{\crexp{\apo@m@challenge}}\fi}

% Monster sections and actions
\newcommand{\monstersection}[1]{%
  \par\vspace{6pt}{\displayfont\color{titlered}\fontsize{14}{15}\selectfont#1\par}%
  \nointerlineskip\vspace{1pt}{\color{titlered}\hrule height 0.6pt}\par\nointerlineskip\vspace{3pt}}
\let\rpgmonstersection\monstersection
\NewDocumentEnvironment{monsteraction}{o}
  {\par\IfValueT{#1}{\textbf{\itshape #1.}~}\ignorespaces}{\par}
\NewDocumentEnvironment{rpg-monsteraction}{o}
  {\par\IfValueT{#1}{\textbf{\itshape #1.}~}\ignorespaces}{\par}
\let\DndMonsterAction\relax
\NewDocumentCommand{\DndMonsterAction}{m}{\par\textbf{\itshape #1.}~}

% \stat{12} -> "12 (+1)"
\newcommand{\stat}[1]{%
  \edef\apo@mod{\fpeval{floor((#1-10)/2)}}%
  #1~(\ifnum\apo@mod<0 \textminus\the\numexpr-\apo@mod\relax\else +\apo@mod\fi)}
\providecommand{\textminus}{\ensuremath{-}}
% \rpgdice{2d6+3} -> "10 (2d6 + 3)"
\newcommand{\rpgdice}[1]{%
  \StrDel{#1}{ }[\apo@d]%
  \StrBefore{\apo@d}{d}[\apo@dn]%
  \StrBehind{\apo@d}{d}[\apo@ds]%
  \def\apo@dm{0}\def\apo@dmtxt{}%
  \IfSubStr{\apo@ds}{+}{%
    \StrBehind{\apo@ds}{+}[\apo@dm]\StrBefore{\apo@ds}{+}[\apo@ds]%
    \edef\apo@dmtxt{ + \apo@dm}}{%
  \IfSubStr{\apo@ds}{-}{%
    \StrBehind{\apo@ds}{-}[\apo@tmpm]\StrBefore{\apo@ds}{-}[\apo@ds]%
    \edef\apo@dm{-\apo@tmpm}\edef\apo@dmtxt{ \textminus{} \apo@tmpm}}{}}%
  \ifx\apo@dn\@empty\def\apo@dn{1}\fi
  \fpeval{floor(\apo@dn*(\apo@ds+1)/2)+(\apo@dm)}~(\apo@dn d\apo@ds\apo@dmtxt)}
\let\dice\rpgdice
% Challenge rating with XP
\newcommand\crexp[1]{%
  \IfStrEqCase{#1}{%
    {0}{0 (0 XP)}{1/8}{1/8 (25 XP)}{1/4}{1/4 (50 XP)}{1/2}{1/2 (100 XP)}%
    {1}{1 (200 XP)}{2}{2 (450 XP)}{3}{3 (700 XP)}{4}{4 (1,100 XP)}%
    {5}{5 (1,800 XP)}{6}{6 (2,300 XP)}{7}{7 (2,900 XP)}{8}{8 (3,900 XP)}%
    {9}{9 (5,000 XP)}{10}{10 (5,900 XP)}{11}{11 (7,200 XP)}{12}{12 (8,400 XP)}%
    {13}{13 (10,000 XP)}{14}{14 (11,500 XP)}{15}{15 (13,000 XP)}%
    {16}{16 (15,000 XP)}{17}{17 (18,000 XP)}{18}{18 (20,000 XP)}%
    {19}{19 (22,000 XP)}{20}{20 (25,000 XP)}{21}{21 (33,000 XP)}%
    {22}{22 (41,000 XP)}{23}{23 (50,000 XP)}{24}{24 (62,000 XP)}%
    {25}{25 (75,000 XP)}{26}{26 (90,000 XP)}{27}{27 (105,000 XP)}%
    {28}{28 (120,000 XP)}{29}{29 (135,000 XP)}{30}{30 (155,000 XP)}%
  }[#1]}

%% ========================================================================
%% SPELLS, AFFLICTIONS, ITEMS
%% ========================================================================
% \spellheader{Name}{Level & school}{Casting time}{Range}{Components}{Duration}
\newcommand{\apo@sline}[2]{\par\noindent\textbf{#1:}~#2}
\NewDocumentCommand{\spellheader}{m m m m m m}{%
  \par\addvspace{8pt}\noindent
  {\displayfont\bfseries\color{titlered}\fontsize{13}{14}\selectfont#1\par}
  {\itshape#2\par}\vspace{2pt}%
  \apo@sline{Casting Time}{#3}\apo@sline{Range}{#4}%
  \apo@sline{Components}{#5}\apo@sline{Duration}{#6}\par\vspace{4pt}}
\let\DndSpellHeader\spellheader
% \itemheader{Name}{Wondrous item, rare (requires attunement)}
\NewDocumentCommand{\itemheader}{m m}{%
  \par\addvspace{8pt}\noindent
  {\displayfont\bfseries\color{titlered}\fontsize{13}{14}\selectfont#1\par}
  {\itshape#2\par}\vspace{2pt}}
\let\DndItemHeader\itemheader

\endinput

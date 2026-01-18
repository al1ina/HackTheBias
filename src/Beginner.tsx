import "./Beginner.css";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChevronRight, RotateCcw, ArrowLeft } from "lucide-react";

type QuestionType = "matching" | "typing" | "true-false" | "word-spelling";

type Question = {
  id: number;
  type: QuestionType;
  question: string;
  correctAnswer: string | number;
  pairs?: { letter: string; sign: string }[];
  imageSrc?: string;
  fallbackEmoji?: string;
  word?: string; // For word-spelling questions
};

type TierType = "beginner" | "intermediate" | "expert" | "pro";

type BeginnerProps = {
  tierType?: TierType;
};

// Helper to get image path or fallback to emoji
const getImageSrc = (letter: string, fallbackEmoji: string): { type: "image" | "emoji"; src: string } => {
  // All letters A-W have images available
  const imageLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"];
  if (imageLetters.includes(letter)) {
    return { type: "image", src: `/${letter}.png` };
  }
  // Fallback to emoji only if letter doesn't have an image (shouldn't happen for A-W)
  return { type: "emoji", src: fallbackEmoji };
};

const Beginner = ({ tierType = "beginner" }: BeginnerProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const levelNumber = parseInt(searchParams.get("level") || "1");
  const initialMode = searchParams.get("mode") === "quiz" ? "quiz" : "learning";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState(initialMode);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string | number>>({});
  const [showResults, setShowResults] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [draggedIcon, setDraggedIcon] = useState<string | null>(null);
  const [droppedIcons, setDroppedIcons] = useState<Record<string, string>>({});
  const [highestScore, setHighestScore] = useState<number>(0);
  const [wordSpellingAnswers, setWordSpellingAnswers] = useState<Record<number, string>>({});

  // All letters with their emojis (for letters without images) - A through W
  const allLettersData: Array<{letter: string; instruction: string; emoji: string}> = [
    { letter: "A", instruction: "Make a fist with your thumb on the side", emoji: "✊" },
    { letter: "B", instruction: "Hold your hand flat with fingers together, thumb across palm", emoji: "🖐️" },
    { letter: "C", instruction: "Curve your hand to form a C shape", emoji: "🤌" },
    { letter: "D", instruction: "Point your index finger up, other fingers touch thumb", emoji: "☝️" },
    { letter: "E", instruction: "Curl all fingers down toward palm, thumb across them", emoji: "✊" },
    { letter: "F", instruction: "Touch thumb and index finger, other fingers up", emoji: "👌" },
    { letter: "G", instruction: "Point index and middle fingers up", emoji: "✌️" },
    { letter: "H", instruction: "Index and middle finger together pointing up", emoji: "✌️" },
    { letter: "I", instruction: "Pinky finger up", emoji: "🤘" },
    { letter: "J", instruction: "Pinky draws J in air", emoji: "✍️" },
    { letter: "K", instruction: "Index and middle finger up like V", emoji: "✌️" },
    { letter: "L", instruction: "Index finger and thumb form L", emoji: "👌" },
    { letter: "M", instruction: "Three fingers down, thumb tucked", emoji: "✊" },
    { letter: "N", instruction: "Two fingers down, thumb tucked", emoji: "✊" },
    { letter: "O", instruction: "Form a circle with thumb and index finger", emoji: "👌" },
    { letter: "P", instruction: "Index finger points down, thumb touches middle finger", emoji: "👌" },
    { letter: "Q", instruction: "Make a circle with thumb and index, point down", emoji: "👌" },
    { letter: "R", instruction: "Index and middle finger cross", emoji: "✌️" },
    { letter: "S", instruction: "Fist with thumb over fingers", emoji: "✊" },
    { letter: "T", instruction: "Fist with thumb between index and middle", emoji: "✊" },
    { letter: "U", instruction: "Index and middle finger together up", emoji: "✌️" },
    { letter: "V", instruction: "Index and middle finger spread apart up", emoji: "✌️" },
    { letter: "W", instruction: "Index, middle, and ring finger up, spread apart", emoji: "✌️" },
  ];

  // Build icon bank - all letters learned up to current level (CUMULATIVE for quizzes)
  const getIconBank = (currentLevel: number) => {
    const lettersPerLevel = 4;
    const endIdx = Math.min(currentLevel * lettersPerLevel, allLettersData.length);
    
    const bank: Array<{letter: string; imageData: {type: "image" | "emoji"; src: string}}> = [];
    for (let i = 0; i < endIdx; i++) {
      const letterData = allLettersData[i];
      bank.push({
        letter: letterData.letter,
        imageData: getImageSrc(letterData.letter, letterData.emoji)
      });
    }
    return bank;
  };

  // Shuffle function for randomizing
  const shuffle = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Different question sets for each level
  // Lessons: NON-CUMULATIVE (Level 1: ABCD, Level 2: EFGH)
  // Quizzes: CUMULATIVE (Quiz 1: ABCD, Quiz 2: ABCDEFGH, Quiz 3: ABCDEFGHIJKL...)
  const getLevelData = (level: number) => {
    const lettersPerLevel = 4;
    // For lessons: only show letters for this level
    const startIdx = (level - 1) * lettersPerLevel;
    const levelLetters = allLettersData.slice(startIdx, startIdx + lettersPerLevel);

    const letters = levelLetters.map(ld => ({
      letter: ld.letter,
      instruction: ld.instruction,
      imageData: getImageSrc(ld.letter, ld.emoji)
    }));

    // For quizzes: ALL letters learned so far (cumulative)
    const quizLetters = allLettersData.slice(0, level * lettersPerLevel);
    const shuffledQuizLetters = shuffle([...quizLetters]);

    const questions: Question[] = [];

    // More questions per quiz - mix of different types
    // Typing questions (shuffled order)
    shuffledQuizLetters.forEach((ld, idx) => {
      questions.push({
        id: questions.length,
        type: "typing",
        question: "What letter is this sign?",
        correctAnswer: ld.letter,
        imageSrc: getImageSrc(ld.letter, ld.emoji).type === "image" ? `/${ld.letter}.png` : undefined,
        fallbackEmoji: ld.emoji
      });
    });

    // Matching question with shuffled letters
    if (quizLetters.length >= 3) {
      const pairs = shuffle([...quizLetters]).slice(0, Math.min(4, quizLetters.length)).map(ld => ({
        letter: ld.letter,
        sign: getImageSrc(ld.letter, ld.emoji).src
      }));
      questions.push({
        id: questions.length,
        type: "matching",
        question: "Match each letter to its sign",
        pairs: pairs,
        correctAnswer: "matched"
      });
    }

    // Word spelling questions (for level 2+)
    // Include words like "hello", "bed", "cafe", etc.
    if (level >= 2 && quizLetters.length >= 3) {
      // Create comprehensive word list that uses available letters
      const allWordOptions = [
        // 3-letter words
        { word: "BAD", letters: ["B", "A", "D"] },
        { word: "CAB", letters: ["C", "A", "B"] },
        { word: "FED", letters: ["F", "E", "D"] },
        { word: "ACE", letters: ["A", "C", "E"] },
        { word: "BED", letters: ["B", "E", "D"] },
        { word: "CAD", letters: ["C", "A", "D"] },
        { word: "DAB", letters: ["D", "A", "B"] },
        // 4-letter words
        { word: "BEAD", letters: ["B", "E", "A", "D"] },
        { word: "FACE", letters: ["F", "A", "C", "E"] },
        { word: "FADE", letters: ["F", "A", "D", "E"] },
        { word: "FEED", letters: ["F", "E", "E", "D"] },
        { word: "CABE", letters: ["C", "A", "B", "E"] },
        // 5-letter words (for levels with more letters)
        { word: "HELLO", letters: ["H", "E", "L", "L", "O"] },
        { word: "BELLE", letters: ["B", "E", "L", "L", "E"] },
        { word: "FACED", letters: ["F", "A", "C", "E", "D"] },
        { word: "CAFED", letters: ["C", "A", "F", "E", "D"] },
        // Longer words when more letters are available
        { word: "BACHELOR", letters: ["B", "A", "C", "H", "E", "L", "O", "R"] },
        { word: "CABLED", letters: ["C", "A", "B", "L", "E", "D"] },
        { word: "FABLED", letters: ["F", "A", "B", "L", "E", "D"] },
      ];

      // Filter words to only include those using available letters
      const availableLettersSet = new Set(quizLetters.map(ql => ql.letter));
      const wordOptions = allWordOptions.filter(w => 
        w.letters.every(l => availableLettersSet.has(l))
      );
      
      // Add 1-2 word spelling questions based on level
      const numWordQuestions = level >= 3 ? 2 : 1;
      for (let i = 0; i < numWordQuestions && wordOptions.length > 0; i++) {
        const selectedWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
        questions.push({
          id: questions.length,
          type: "word-spelling",
          question: `Spell the word "${selectedWord.word.toUpperCase()}" using hand signs`,
          word: selectedWord.word.toUpperCase(),
          correctAnswer: selectedWord.word.toUpperCase()
        });
        // Remove selected word to avoid duplicates
        const index = wordOptions.indexOf(selectedWord);
        if (index > -1) wordOptions.splice(index, 1);
      }
    }

    // Shuffle all questions so order is random
    return { letters, questions: shuffle(questions) };
  };

  const { letters, questions } = useMemo(() => getLevelData(levelNumber), [levelNumber]);

  // ============================================================================
  // LEVEL LOGIC BRANCHING: Pro and Expert redirect to camera quiz page
  // ============================================================================
  // Beginner and Intermediate: Use existing manual quiz/learning logic (unchanged)
  // Pro and Expert: Redirect to camera quiz page (questions to be added later)
  // ============================================================================
  
  // Check if this tier uses camera quiz page
  const usesCameraQuiz = tierType === "pro" || tierType === "expert";
  
  // For Pro/Expert: Redirect to camera quiz page for both learning and quiz mode
  useEffect(() => {
    if (usesCameraQuiz) {
      navigate(`/camera-quiz?level=${levelNumber}&tier=${tierType}`);
    }
  }, [usesCameraQuiz, levelNumber, tierType, navigate]);

  // If Pro/Expert, don't render anything (redirecting)
  if (usesCameraQuiz) {
    return null;
  }

  // Load highest score on mount
  useEffect(() => {
    const loadHighestScore = async () => {
      const userId = localStorage.getItem("user_id");
      if (userId) {
        try {
          const response = await fetch(
            `http://localhost:5001/get-score?user_id=${userId}&level_type=${tierType}&level_number=${levelNumber}`
          );
          if (response.ok) {
            const data = await response.json();
            setHighestScore(data.highest_score || 0);
          }
        } catch (error) {
          console.error("Failed to load highest score:", error);
        }
      }
    };
    loadHighestScore();
  }, [levelNumber, tierType]);

  const fullText =
    mode === "learning"
      ? `Learn Level ${levelNumber} - "${letters[currentIndex]?.letter}"`
      : `Level ${levelNumber} Quiz`;

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 45);

    return () => clearInterval(timer);
  }, [currentIndex, mode, fullText]);

  const handleContinue = () => {
    if (currentIndex < letters.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setMode("quiz");
      setCurrentIndex(0);
    }
  };

  const handleQuizAnswer = (index: number, answer: string | number) => {
    setQuizAnswers({ ...quizAnswers, [index]: answer });
  };

  const handleDragStart = (e: React.DragEvent, iconSrc: string) => {
    setDraggedIcon(iconSrc);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, questionId: number, letter: string) => {
    e.preventDefault();
    if (draggedIcon) {
      const newDropped = { ...droppedIcons, [`${questionId}-${letter}`]: draggedIcon };
      setDroppedIcons(newDropped);
      
      const currentQuestion = questions[currentIndex];
      if (currentQuestion.type === "matching" && currentQuestion.pairs) {
        let allMatched = true;
        currentQuestion.pairs.forEach(pair => {
          const dropped = newDropped[`${questionId}-${pair.letter}`];
          if (!dropped || dropped !== pair.sign) {
            allMatched = false;
          }
        });
        if (allMatched) {
          setQuizAnswers({ ...quizAnswers, [questionId]: "matched" });
        }
      }
      setDraggedIcon(null);
    }
  };

  const handleSubmitQuiz = async () => {
    setShowResults(true);
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    const userId = localStorage.getItem("user_id");
    
    // Save score regardless of percentage
    if (userId) {
      try {
        const response = await fetch("http://localhost:5001/save-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId),
            level_type: tierType,
            level_number: levelNumber,
            score: percentage
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setHighestScore(data.highest_score || percentage);
        }
      } catch (error) {
        console.error("Failed to save score:", error);
      }
    }

    if (percentage === 100 && userId) {
      setLevelComplete(true);

      if (levelNumber === 5) {
        const tierOrder = ["beginner", "intermediate", "expert", "pro"];
        const currentTierIndex = tierOrder.indexOf(tierType);
        const nextTier = currentTierIndex < tierOrder.length - 1 ? tierOrder[currentTierIndex + 1] : tierType;
        
        try {
          const response = await fetch("http://localhost:5001/update-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: parseInt(userId),
              level_type: nextTier,
              level_number: 1
            }),
          });
          const data = await response.json();
          if (data.success) {
            localStorage.setItem("level_type", nextTier);
            localStorage.setItem("level_number", "1");
          }
        } catch (error) {
          console.error("Failed to update progress:", error);
        }
      } else {
        const nextLevel = levelNumber + 1;
        try {
          const response = await fetch("http://localhost:5001/update-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: parseInt(userId),
              level_type: tierType,
              level_number: nextLevel
            }),
          });
          const data = await response.json();
          if (data.success) {
            localStorage.setItem("level_type", tierType);
            localStorage.setItem("level_number", nextLevel.toString());
          }
        } catch (error) {
          console.error("Failed to update progress:", error);
        }
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setMode("learning");
    setQuizAnswers({});
    setShowResults(false);
    setLevelComplete(false);
    setDroppedIcons({});
    setDraggedIcon(null);
    setWordSpellingAnswers({});
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const answer = quizAnswers[idx];
      if (q.type === "matching") {
        if (answer === "matched") {
          let allCorrect = true;
          q.pairs?.forEach(pair => {
            const dropped = droppedIcons[`${idx}-${pair.letter}`];
            if (dropped !== pair.sign) {
              allCorrect = false;
            }
          });
          if (allCorrect) correct++;
        }
      } else if (q.type === "true-false") {
        if (answer === q.correctAnswer) correct++;
      } else if (q.type === "word-spelling") {
        const userAnswer = wordSpellingAnswers[idx] || "";
        if (String(userAnswer).toUpperCase() === String(q.correctAnswer).toUpperCase()) {
          correct++;
        }
      } else {
        if (String(answer).toUpperCase() === String(q.correctAnswer).toUpperCase()) correct++;
      }
    });
    return correct;
  };

  const tierRoutes: Record<TierType, string> = {
    beginner: "/beginner-levels",
    intermediate: "/intermediate-levels",
    expert: "/expert-levels",
    pro: "/pro-levels"
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="beginner-page scrollable-container">
      <button className="back-to-levels-btn" onClick={() => navigate(tierRoutes[tierType])}>
        <ArrowLeft size={18} />
        <span>Back to Levels</span>
      </button>
      <div className="beginner-card">{children}</div>
    </div>
  );

  const Title = () => (
    <div className="beginner-titleRow">
      <h1 className="beginner-title">
        {displayedText}
        {isTyping && <span className="beginner-caret">|</span>}
      </h1>
    </div>
  );

  // Learning Mode
  if (mode === "learning") {
    const currentLetter = letters[currentIndex];
    if (!currentLetter) return null;
    
    const progress = ((currentIndex + 1) / letters.length) * 100;

    return (
      <Wrapper>
        <Title />
        <div className="beginner-panel">
          <div className="beginner-image-container">
            {currentLetter.imageData.type === "image" ? (
              <img src={currentLetter.imageData.src} alt={currentLetter.letter} className="letter-image" />
            ) : (
              <div className="beginner-emoji">{currentLetter.imageData.src}</div>
            )}
          </div>
          <div className="beginner-letter">{currentLetter.letter}</div>
          <p className="beginner-instruction">{currentLetter.instruction}</p>
        </div>
        <div className="beginner-progressBlock">
          <div className="beginner-progressMeta">
            <span>Progress</span>
            <span>{currentIndex + 1} / {letters.length}</span>
          </div>
          <div className="beginner-progressTrack">
            <div className="beginner-progressFill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="beginner-btn primary" onClick={handleContinue}>
          <span>{currentIndex < letters.length - 1 ? "Continue" : "Start Quiz"}</span>
          <ChevronRight size={20} />
        </button>
      </Wrapper>
    );
  }

  // Results Mode
  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const perfect = score === questions.length;

    return (
      <Wrapper>
        <h1 className="beginner-resultsTitle">Quiz Results</h1>
        <div className="beginner-scorePanel">
          <div className="beginner-score">
            {score} <span className="beginner-scoreSlash">/ {questions.length}</span>
          </div>
          <p className="beginner-scoreText">
            {perfect ? "Perfect! 🎉" : score >= questions.length / 2 ? "Good job! 👏" : "Keep practicing! 💪"}
          </p>
          {highestScore > 0 && (
            <p className="beginner-highest-score">Highest Score: {highestScore}%</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
          {levelComplete && (
            <button className="beginner-btn primary" onClick={() => navigate(tierRoutes[tierType])}>
              <span>{levelNumber === 5 ? `Continue to ${tierType === "beginner" ? "Intermediate" : "Next Tier"} →` : "Continue to Next Level →"}</span>
            </button>
          )}
          <button className="beginner-btn secondary" onClick={handleRestart}>
            <RotateCcw size={18} />
            <span>Restart</span>
          </button>
        </div>
      </Wrapper>
    );
  }

  // Quiz Mode - Render different question types
  // Safety check: Ensure questions array exists and has items
  if (!questions || questions.length === 0) {
    console.warn("Quiz mode: questions array is empty", { questions, levelNumber, tierType });
    return (
      <Wrapper>
        <Title />
        <div className="beginner-panel">
          <p style={{ color: "white", textAlign: "center" }}>
            Loading questions...
          </p>
        </div>
      </Wrapper>
    );
  }
  
  const currentQuestionForRender = questions[currentIndex];
  if (!currentQuestionForRender) {
    console.warn("Quiz mode: currentQuestion is undefined", { currentIndex, questionsLength: questions.length, mode });
    return (
      <Wrapper>
        <Title />
        <div className="beginner-panel">
          <p style={{ color: "white", textAlign: "center" }}>
            Question {currentIndex + 1} not found. Please try again.
          </p>
        </div>
      </Wrapper>
    );
  }

  const renderQuestion = () => {
    const currentQuestion = currentQuestionForRender;
    switch (currentQuestion.type) {
      case "typing":
        return (
          <div className="beginner-quizList">
            <div className="beginner-quizRow">
              <div className="beginner-image-container">
                {currentQuestion.imageSrc ? (
                  <img src={currentQuestion.imageSrc} alt="Sign" className="letter-image-quiz" />
                ) : (
                  <span className="beginner-quizEmoji">{currentQuestion.fallbackEmoji}</span>
                )}
              </div>
              <input
                type="text"
                maxLength={1}
                value={String(quizAnswers[currentIndex] || "")}
                onChange={(e) => handleQuizAnswer(currentIndex, e.target.value.toUpperCase())}
                className="beginner-input"
                placeholder="?"
              />
            </div>
            <p className="beginner-question-text">{currentQuestion.question}</p>
          </div>
        );

      case "matching":
        const iconBank = getIconBank(levelNumber);
        return (
          <div className="beginner-quizList">
            <p className="beginner-question-text">{currentQuestion.question}</p>
            <p className="beginner-question-hint">Drag icons from the bank to match letters</p>
            
            <div className="icon-bank">
              <h4>Icon Bank</h4>
              <div className="icon-bank-grid scrollable-icon-bank">
                {iconBank.map((item, idx) => (
                  <div
                    key={idx}
                    className="bank-icon"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.imageData.src)}
                  >
                    {item.imageData.type === "image" ? (
                      <img src={item.imageData.src} alt={item.letter} className="bank-icon-image" />
                    ) : (
                      <span>{item.imageData.src}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="matching-container">
              {currentQuestion.pairs?.map((pair, pairIdx) => {
                const dropped = droppedIcons[`${currentIndex}-${pair.letter}`];
                const isCorrect = dropped === pair.sign;
                return (
                  <div key={pairIdx} className="matching-row">
                    <div className="matching-item">{pair.letter}</div>
                    <div className="matching-arrow">→</div>
                    <div
                      className={`matching-drop-zone ${dropped ? (isCorrect ? "matched" : "incorrect") : ""}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, currentIndex, pair.letter)}
                    >
                      {dropped ? (
                        pair.sign.startsWith("/") ? (
                          <img src={pair.sign} alt="Dropped" className="dropped-icon-image" />
                        ) : (
                          <span>{pair.sign}</span>
                        )
                      ) : (
                        "Drop here"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "true-false":
        return (
          <div className="beginner-quizList">
            <p className="beginner-question-text">{currentQuestion.question}</p>
            <div className="true-false-options">
              <button
                className={`choice-button ${quizAnswers[currentIndex] === 1 ? "selected" : ""}`}
                onClick={() => handleQuizAnswer(currentIndex, 1)}
              >
                True
              </button>
              <button
                className={`choice-button ${quizAnswers[currentIndex] === 0 ? "selected" : ""}`}
                onClick={() => handleQuizAnswer(currentIndex, 0)}
              >
                False
              </button>
            </div>
          </div>
        );

      case "word-spelling":
        const iconBankForWord = getIconBank(levelNumber);
        const currentWord = currentQuestion.word || "";
        const wordAnswer = wordSpellingAnswers[currentIndex] || "";
        
        return (
          <div className="beginner-quizList">
            <p className="beginner-question-text">{currentQuestion.question}</p>
            
            <div className="icon-bank">
              <h4>Icon Bank</h4>
              <div className="icon-bank-grid scrollable-icon-bank">
                {iconBankForWord.map((item, idx) => (
                  <div
                    key={idx}
                    className="bank-icon"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.imageData.src)}
                  >
                    {item.imageData.type === "image" ? (
                      <img src={item.imageData.src} alt={item.letter} className="bank-icon-image" />
                    ) : (
                      <span>{item.imageData.src}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="word-spelling-container">
              <p className="word-label">Spell: <strong>{currentWord}</strong></p>
              <div className="word-spelling-slots">
                {currentWord.split("").map((letter, idx) => {
                  const dropped = droppedIcons[`word-${currentIndex}-${idx}`];
                  // Check if dropped icon matches the expected letter
                  let isCorrect = false;
                  if (dropped) {
                    const expectedImageData = getImageSrc(letter, allLettersData.find(ld => ld.letter === letter)?.emoji || "");
                    // Check if the dropped icon matches the expected image or emoji for this letter
                    isCorrect = dropped === expectedImageData.src;
                    // Also check by finding the letter that matches the dropped icon
                    if (!isCorrect) {
                      const matchingLetter = allLettersData.find(ld => getImageSrc(ld.letter, ld.emoji).src === dropped);
                      isCorrect = matchingLetter?.letter === letter;
                    }
                  }
                  
                  return (
                    <div key={idx} className="word-spelling-slot">
                      <div className="word-letter-label">{letter}</div>
                      <div
                        className={`word-drop-zone ${dropped ? (isCorrect ? "matched" : "incorrect") : ""}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIcon) {
                            const newDropped = { ...droppedIcons, [`word-${currentIndex}-${idx}`]: draggedIcon };
                            setDroppedIcons(newDropped);
                            
                            // Build the word from dropped icons
                            let builtWord = "";
                            for (let i = 0; i < currentWord.length; i++) {
                              const droppedIcon = newDropped[`word-${currentIndex}-${i}`];
                              if (droppedIcon) {
                                // Find letter that matches this icon
                                const letterMatch = allLettersData.find(ld => getImageSrc(ld.letter, ld.emoji).src === droppedIcon);
                                if (letterMatch) {
                                  builtWord += letterMatch.letter;
                                }
                              }
                            }
                            setWordSpellingAnswers({ ...wordSpellingAnswers, [currentIndex]: builtWord });
                            setDraggedIcon(null);
                          }
                        }}
                      >
                        {dropped ? (
                          dropped.startsWith("/") ? (
                            <img src={dropped} alt="Dropped" className="dropped-icon-image" />
                          ) : (
                            <span>{dropped}</span>
                          )
                        ) : (
                          "Drop"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Quiz Mode - continue (use same variable from above)
  const isComplete = currentQuestionForRender.type === "word-spelling" 
    ? wordSpellingAnswers[currentIndex] && wordSpellingAnswers[currentIndex].length === (currentQuestionForRender.word?.length || 0)
    : quizAnswers[currentIndex] !== undefined && quizAnswers[currentIndex] !== "";
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <Wrapper>
      <Title />
      {renderQuestion()}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {currentIndex > 0 && (
          <button
            className="beginner-btn secondary"
            onClick={() => setCurrentIndex(currentIndex - 1)}
          >
            ← Previous
          </button>
        )}
        <button
          className={`beginner-btn primary ${!isComplete ? "disabled" : ""}`}
          onClick={() => {
            if (isLastQuestion) {
              handleSubmitQuiz();
            } else {
              setCurrentIndex(currentIndex + 1);
            }
          }}
          disabled={!isComplete}
        >
          {isLastQuestion ? "Submit Quiz" : "Next →"}
        </button>
      </div>
    </Wrapper>
  );
};

export default Beginner;

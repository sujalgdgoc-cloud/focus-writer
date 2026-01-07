import { useState, useEffect } from "react";
import "./App.css";
import {
  Library,
  CheckCircle,
  XCircle,
  Upload,
  Book,
  Trophy,
  Clock,
  TrendingUp,
  Target,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Flame,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import { auth, googleProvider } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText;
};

const extractTextFromHTML = (htmlString) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;
  const scripts = tempDiv.querySelectorAll("script, style");
  scripts.forEach((script) => script.remove());
  return tempDiv.textContent || tempDiv.innerText || "";
};

export default function FocusWriterApp() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");

  // Auth form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  // UI state
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Typing state
  const [selectedText, setSelectedText] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [textPages, setTextPages] = useState([]);
  const [uploadedTexts, setUploadedTexts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const CHARS_PER_PAGE = 500;

  // Initialize auth
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
    setAuthLoading(false);
  });

  return () => unsubscribe();
}, []);

  // Sample data
  const stats = {
    averageWPM: 61,
    averageAccuracy: 94,
    totalPracticeTime: "24h 35m",
    totalTests: 127,
    bestWPM: 75,
    streak: 12,
  };

  const defaultLibrary = [
    {
      id: 1,
      title: "The Quick Brown Fox",
      category: "Beginner",
      text: "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice. Practice makes perfect, and consistent typing exercises help improve both speed and accuracy.",
      isDefault: true,
    },
    {
      id: 2,
      title: "Programming Wisdom",
      category: "Intermediate",
      text: "Code is like humor. When you have to explain it, it's bad. Clean code always looks like it was written by someone who cares. Programs must be written for people to read, and only incidentally for machines to execute. The best code is no code at all.",
      isDefault: true,
    },
    {
      id: 3,
      title: "Nature's Beauty",
      category: "Advanced",
      text: "In every walk with nature, one receives far more than he seeks. The poetry of the earth is never dead, and the mountains are calling. Look deep into nature, and then you will understand everything better. Nature does not hurry, yet everything is accomplished.",
      isDefault: true,
    },
    {
      id: 4,
      title: "JavaScript Basics",
      category: "Intermediate",
      text: "JavaScript is a versatile programming language that runs in the browser. Variables can be declared using let, const, or var. Functions are first-class citizens in JavaScript. Arrow functions provide a concise syntax for writing function expressions.",
      isDefault: true,
    },
  ];

  // Auth handlers
  
// Login
const handleLogin = async (e) => {
  e.preventDefault();
  setAuthError("");
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginEmail,
      loginPassword
    );
    setCurrentUser(userCredential.user);
    setIsAuthenticated(true);
  } catch (error) {
    setAuthError(error.message);
  }
};

// Signup
const handleSignup = async (e) => {
  e.preventDefault();
  setAuthError("");
  if (signupPassword.length < 6) {
    setAuthError("Password must be at least 6 characters");
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      signupEmail,
      signupPassword
    );
    await userCredential.user.updateProfile({
      displayName: signupName,
    });
    setCurrentUser(userCredential.user);
    setIsAuthenticated(true);
  } catch (error) {
    setAuthError(error.message);
  }
};

// Google Sign-In
const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    setCurrentUser(result.user);
    setIsAuthenticated(true);
  } catch (error) {
    setAuthError(error.message);
  }
};

// Logout
const handleLogout = async () => {
  await signOut(auth);
  setCurrentUser(null);
  setIsAuthenticated(false);
  setSelectedText(null);
  setUserInput("");
  setUploadedTexts([]);
};

  // Typing handlers
  const splitTextIntoPages = (text) => {
    const pages = [];
    let currentIndex = 0;
    while (currentIndex < text.length) {
      let endIndex = currentIndex + CHARS_PER_PAGE;
      if (endIndex < text.length) {
        const nextSpace = text.indexOf(" ", endIndex);
        const prevSpace = text.lastIndexOf(" ", endIndex);
        if (nextSpace !== -1 && nextSpace - endIndex < 50) {
          endIndex = nextSpace + 1;
        } else if (prevSpace !== -1 && endIndex - prevSpace < 50) {
          endIndex = prevSpace + 1;
        }
      }
      pages.push(text.substring(currentIndex, endIndex));
      currentIndex = endIndex;
    }
    return pages;
  };

  const handleTextSelect = (text) => {
    setSelectedText(text);
    setTextPages(splitTextIntoPages(text.text));
    setCurrentPage(0);
    setUserInput("");
    setErrors(0);
    setStartTime(null);
    setIsLibraryOpen(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const currentPageText = textPages[currentPage] || "";
    if (value.length > currentPageText.length) return;

    if (!startTime && value.length > 0) {
      setStartTime(Date.now());
    }

    if (value.length > userInput.length) {
      const newCharIndex = value.length - 1;
      if (value[newCharIndex] !== currentPageText[newCharIndex]) {
        setErrors((prev) => prev + 1);
      }
    }

    setUserInput(value);

    if (value === currentPageText && currentPage < textPages.length - 1) {
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setUserInput("");
      }, 500);
    }
  };

  const calculateAccuracy = () => {
    if (!userInput.length) return 100;
    const currentPageText = textPages[currentPage] || "";
    const correctChars = userInput
      .split("")
      .filter((char, idx) => char === currentPageText[idx]).length;
    return Math.round((correctChars / userInput.length) * 100);
  };

  const calculateWPM = () => {
  if (!startTime || !userInput.length) return 0;

  const timeInMinutes = (Date.now() - startTime) / 60000; // total time in minutes
  const charsTyped = userInput.length; // total typed chars
  const wordsTyped = charsTyped / 5; // standard WPM = chars / 5
  return Math.round(wordsTyped / timeInMinutes)
  };

  // File upload handlers
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();
    const supportedFormats = ["txt", "md", "html", "htm", "pdf"];


    if (!supportedFormats.includes(fileExtension)) {
      alert(
        `Supported formats: ${supportedFormats.join(", ")}. For PDF/DOCX, please copy-paste the text.`
      );
      return;
    }

    setIsUploading(true);

    try {
      let text = "";
      if (fileExtension === "txt" || fileExtension === "md") {
  text = await file.text();
} else if (fileExtension === "html" || fileExtension === "htm") {
  const htmlText = await file.text();
  text = extractTextFromHTML(htmlText);
} else if (fileExtension === "pdf") {
  text = await extractTextFromPDF(file);
}

      addUploadedText(file.name, text);
    } catch (error) {
      alert("Error uploading file: " + error.message);
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const addUploadedText = (fileName, content) => {
    const newText = {
      id: `uploaded-${Date.now()}`,
      title: fileName.replace(/\.(txt|md|html|htm)$/i, ""),
      category: "Uploaded",
      text: content.trim(),
      isDefault: false,
    };
    setUploadedTexts((prev) => [...prev, newText]);
    alert(`"${newText.title}" added to library!`);
  };

  const handleDeleteUploadedText = (id) => {
    setUploadedTexts((prev) => prev.filter((text) => text.id !== id));
    if (selectedText?.id === id) {
      setSelectedText(null);
      setUserInput("");
      setTextPages([]);
      setCurrentPage(0);
    }
  };

  const library = [...defaultLibrary, ...uploadedTexts];
  const currentPageText = textPages[currentPage] || "";
  const isPageCompleted = userInput === currentPageText;
  const isLastPage = currentPage === textPages.length - 1;

  // Loading screen
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
        <div className="text-center">
          <Book className="h-20 w-20 text-white mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-semibold">
            Loading FocusWriter...
          </p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className=" min-h-screen min-w-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <Book className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                FocusWriter
              </h1>
              <p className="text-gray-600">
                {authMode === "login" ? "Welcome back!" : "Create your account"}
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {authError}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full  text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    className="w-full text-gray-500 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="w-full text-gray-500 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full text-gray-500 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 6 characters
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Create Account
                </button>
              </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full text-white flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign {authMode === "login" ? "in" : "up"} with Google
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
              {authMode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError("");
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-white text-sm bg-black bg-opacity-20 rounded-lg px-4 py-2 backdrop-blur-sm">
                Your Focus Partner
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div
      className={`h-screen w-full flex flex-col ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Navbar */}
      <nav
        className={`${
          isDark
            ? "bg-gray-800 border-b border-gray-700"
            : "bg-white border-b border-gray-200"
        } shadow-lg`}
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
              color
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <Book className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  FocusWriter
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg ${
                  isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                {isDark ? (
                  <Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {currentUser && (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-9 h-9 rounded-full ring-2 ring-blue-500"
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">
                      {currentUser.displayName}
                    </p>
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-screen">
        {/* Sidebar */}
        {isSidebarOpen && (
          <div
            className={`w-80 ${
              isDark
                ? "bg-gray-800 border-r border-gray-700"
                : "bg-white border-r border-gray-200"
            } shadow-xl overflow-y-auto p-4`}
          >
            <div className="space-y-4">
              <div
                className={`${
                  isDark
                    ? "bg-gradient-to-br from-blue-900 to-indigo-900"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50"
                } rounded-xl p-6`}
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Trophy className="text-yellow-500" />
                  Your Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`${
                      isDark ? "bg-gray-800/50" : "bg-white/50"
                    } rounded-lg p-3`}
                  >
                    <Clock className="text-blue-600 h-4 w-4 mb-1" />
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.averageWPM}
                    </p>
                    <p className="text-xs text-gray-500">Avg WPM</p>
                  </div>
                  <div
                    className={`${
                      isDark ? "bg-gray-800/50" : "bg-white/50"
                    } rounded-lg p-3`}
                  >
                    <Target className="text-green-600 h-4 w-4 mb-1" />
                    <p className="text-2xl font-bold text-green-600">
                      {stats.averageAccuracy}%
                    </p>
                    <p className="text-xs text-gray-500">Accuracy</p>
                  </div>
                  <div
                    className={`${
                      isDark ? "bg-gray-800/50" : "bg-white/50"
                    } rounded-lg p-3`}
                  >
                    <Flame className="text-orange-600 h-4 w-4 mb-1" />
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.streak}
                    </p>
                    <p className="text-xs text-gray-500">Day Streak</p>
                  </div>
                  <div
                    className={`${
                      isDark ? "bg-gray-800/50" : "bg-white/50"
                    } rounded-lg p-3`}
                  >
                    <TrendingUp className="text-purple-600 h-4 w-4 mb-1" />
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.bestWPM}
                    </p>
                    <p className="text-xs text-gray-500">Best WPM</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div
                className={`${
                  isDark ? "bg-gray-800/50" : "bg-white"
                } rounded-xl p-4 border ${
                  isDark ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Quick Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Tests:</span>
                    <span className="font-semibold">{stats.totalTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Practice Time:</span>
                    <span className="font-semibold">
                      {stats.totalPracticeTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Header */}
          <div
            className={`${
              isDark
                ? "bg-gray-800 border-b border-gray-700"
                : "bg-white border-b border-gray-200"
            } p-4 flex items-center gap-6 flex-wrap`}
          >
            <div className="flex items-center gap-2">
              <Clock className="text-blue-600 h-5 w-5" />
              <span className="text-sm">
                WPM:{" "}
                <span className="font-bold text-blue-600">
                  {calculateWPM()}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="text-green-600 h-5 w-5" />
              <span className="text-sm">
                Accuracy:{" "}
                <span className="font-bold text-green-600">
                  {calculateAccuracy()}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="text-red-600 h-5 w-5" />
              <span className="text-sm">
                Errors: <span className="font-bold text-red-600">{errors}</span>
              </span>
            </div>
            <div className="ml-auto flex gap-2">
              <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer font-medium">
                <Upload className="h-5 w-5" />
                <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                <input
                  type="file"
                  accept=".txt,.md,.html,.htm,.pdf"

                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <button
                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Library className="h-5 w-5" />
                {isLibraryOpen ? "Close Library" : "Select Text"}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Library Modal */}
              {isLibraryOpen && (
                <div
                  className={`${
                    isDark ? "bg-gray-800" : "bg-white"
                  } rounded-xl shadow-xl p-6 border-2 border-blue-500`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Text Library</h2>
                    <button
                      onClick={() => setIsLibraryOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {library.map((item) => (
                      <div
                        key={item.id}
                        className={`border ${
                          isDark
                            ? "border-gray-700 hover:border-blue-500"
                            : "border-gray-200 hover:border-blue-500"
                        } rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer relative`}
                      >
                        <div
                          onClick={() => handleTextSelect(item)}
                          className="mb-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{item.title}</h3>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {item.text}
                          </p>
                        </div>
                        {!item.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUploadedText(item.id);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference Text */}
              <div
                className={`${
                  isDark ? "bg-gray-800" : "bg-white"
                } rounded-xl shadow-lg p-6`}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-600" />
                  Reference Text
                  {selectedText && textPages.length > 1 && (
                    <span className="text-sm text-gray-500 ml-auto">
                      Page {currentPage + 1} of {textPages.length}
                    </span>
                  )}
                </h2>
                {selectedText ? (
                  <div
                    className={`${
                      isDark ? "bg-gray-900" : "bg-gray-50"
                    } rounded-lg p-6 max-h-64 overflow-y-auto`}
                  >
                    <div className="text-lg leading-relaxed font-mono break-words">
                      {currentPageText.split("").map((char, idx) => {
                        let colorClass = "text-gray-400";
                        if (idx < userInput.length) {
                          colorClass =
                            userInput[idx] === char
                              ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                              : "text-red-600 bg-red-50 dark:bg-red-900/30";
                        } else if (idx === userInput.length) {
                          colorClass = isDark
                            ? "text-white bg-yellow-500/50"
                            : "text-gray-900 bg-yellow-100";
                        }
                        return (
                          <span key={idx} className={colorClass}>
                            {char === " " ? "\u00A0" : char}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`${
                      isDark ? "bg-gray-900" : "bg-gray-50"
                    } rounded-lg p-6 h-64 flex items-center justify-center`}
                  >
                    <div className="text-center">
                      <Library className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">
                        Select a text from the library to begin
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Typing Area */}
              <div
                className={`${
                  isDark ? "bg-gray-800" : "bg-white"
                } rounded-xl shadow-lg p-6`}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="text-blue-600" />
                  Your Typing
                </h2>
                <textarea
                  value={userInput}
                  onChange={handleInputChange}
                  disabled={!selectedText}
                  placeholder={
                    selectedText
                      ? "Start typing here..."
                      : "Select a text first..."
                  }
                  className={`w-full h-48 p-6 ${
                    isDark
                      ? "bg-gray-900 text-white"
                      : "bg-gray-50 text-gray-900"
                  } rounded-lg border-2 ${
                    isDark
                      ? "border-gray-700 focus:border-blue-500"
                      : "border-gray-200 focus:border-blue-500"
                  } focus:outline-none resize-none text-lg font-mono leading-relaxed disabled:cursor-not-allowed`}
                  autoFocus
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Characters:{" "}
                    <span className="font-bold">{userInput.length}</span> /{" "}
                    {currentPageText.length}
                  </p>
                  {isPageCompleted && (
                    <div className="flex items-center gap-2 text-green-600 font-medium animate-pulse">
                      <CheckCircle className="h-5 w-5" />
                      {isLastPage ? "All Completed! 🎉" : "Page Completed!"}
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                {selectedText && textPages.length > 1 && (
                  <div className="mt-4 flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        if (currentPage > 0) {
                          setCurrentPage((prev) => prev - 1);
                          setUserInput("");
                        }
                      }}
                      disabled={currentPage === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        currentPage === 0
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } transition-colors`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        if (currentPage < textPages.length - 1) {
                          setCurrentPage((prev) => prev + 1);
                          setUserInput("");
                        }
                      }}
                      disabled={currentPage === textPages.length - 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        currentPage === textPages.length - 1
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } transition-colors`}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
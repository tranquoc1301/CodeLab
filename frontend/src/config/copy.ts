export const COPY = {
  APP_NAME: 'CodeLab',

  NAV: {
    PROBLEMS: 'Problems',
    PROFILE: 'Profile',
    LOGOUT: 'Logout',
    LOGIN: 'Login',
    REGISTER: 'Register',
  },

  HOME: {
    TITLE: 'Problems',
    SUBTITLE: 'Sharpen your skills with coding challenges',
    EMPTY: 'No problems available yet.',
  },

  LOGIN: {
    TITLE: 'Welcome back',
    DESCRIPTION: 'Sign in to your account',
    ERROR: 'Invalid username or password',
    SIGNING_IN: 'Signing in\u2026',
    SIGN_IN: 'Sign in',
    NO_ACCOUNT: "Don't have an account?",
    REGISTER_LINK: 'Register',
  },

  REGISTER: {
    TITLE: 'Create an account',
    DESCRIPTION: 'Start your coding journey',
    ERROR: 'Registration failed',
    CREATING: 'Creating account\u2026',
    CREATE: 'Create account',
    HAS_ACCOUNT: 'Already have an account?',
    SIGN_IN_LINK: 'Sign in',
  },

  PROFILE: {
    TITLE: 'Profile',
    LOGIN_REQUIRED: 'Please login to view your profile.',
    LOADING: 'Loading profile\u2026',
    USERNAME: 'Username',
    EMAIL: 'Email',
    JOINED: 'Joined',
    NOT_AVAILABLE: 'N/A',
    SKILL_MAP_TITLE: 'Skill Map',
    SKILL_MAP_DESCRIPTION:
      'Skill tracking will be available after solving problems with CodeBERT analysis.',
  },

  PROBLEM: {
    NOT_FOUND: 'Problem not found',
    LOADING: 'Loading problem\u2026',
    SAMPLE_INPUT: 'Sample Input',
    SAMPLE_OUTPUT: 'Sample Output',
    STDIN_PLACEHOLDER: 'Enter input\u2026',
    SUBMITTING: 'Submitting\u2026',
    SUBMIT: 'Submit',
    UNKNOWN_STATUS: 'Unknown',
    STDOUT: 'stdout',
    STDERR: 'stderr',
    ERROR_PREFIX: 'Error:',
  },

  FORM_LABELS: {
    USERNAME: 'Username',
    PASSWORD: 'Password',
    EMAIL: 'Email',
    STDIN: 'stdin (optional)',
  },

  CODE_TEMPLATES: {
    python: '# Write your code here\nprint("Hello World")\n',
    java: '// Write your code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}\n',
    cpp: '// Write your code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}\n',
  },

  LANGUAGE_LABELS: {
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
  },
} as const;

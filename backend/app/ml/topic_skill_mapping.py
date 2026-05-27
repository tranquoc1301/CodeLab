"""Map CodeLab topic IDs to Codeforces DKT skill names.

CodeLab has 72 LeetCode-style topics, but the DKT model was trained on
36 Codeforces skills.  This module bridges the gap.

Topics with no reasonable DKT equivalent map to ``None`` and are skipped
during sequence construction (they must NOT fall back to the "special"
skill id 0).
"""

# topic_id (1–72) → Codeforces skill name, or None if unmappable
TOPIC_ID_TO_DKT_SKILL: dict[int, str | None] = {
    1: "data structures",        # Array
    2: "hashing",                # Hash Table
    3: "data structures",        # Linked List
    4: "math",                   # Math
    5: "brute force",            # Recursion
    6: "strings",                # String
    7: "two pointers",           # Sliding Window
    8: "binary search",          # Binary Search
    9: "divide and conquer",     # Divide and Conquer
    10: "two pointers",          # Two Pointers
    11: "dp",                    # Dynamic Programming
    12: "greedy",                # Greedy
    13: "trees",                 # Trie
    14: "sortings",              # Sorting
    15: "brute force",           # Backtracking
    16: "data structures",       # Stack
    17: "data structures",       # Heap (Priority Queue)
    18: "sortings",              # Merge Sort
    19: "strings",               # String Matching
    20: "bitmasks",              # Bit Manipulation
    21: "matrices",              # Matrix
    22: "data structures",       # Monotonic Stack
    23: "implementation",        # Simulation
    24: "combinatorics",         # Combinatorics
    25: "dp",                    # Memoization
    26: "dfs and similar",       # Depth-First Search
    27: "trees",                 # Tree
    28: "trees",                 # Binary Tree
    29: "trees",                 # Binary Search Tree
    30: "graphs",                # Breadth-First Search
    31: "dsu",                   # Union Find
    32: "graphs",                # Graph
    33: None,                    # Design
    34: "data structures",       # Doubly-Linked List
    35: "geometry",              # Geometry
    36: "sortings",              # Bucket Sort
    37: "sortings",              # Radix Sort
    38: "combinatorics",         # Counting
    39: None,                    # Iterator
    40: None,                    # Database
    41: "hashing",               # Rolling Hash
    42: "hashing",               # Hash Function
    43: None,                    # Shell
    44: "brute force",           # Enumeration
    45: "number theory",         # Number Theory
    46: "graphs",                # Topological Sort
    47: "constructive algorithms", # Prefix Sum
    48: "binary search",         # Quickselect
    49: "data structures",       # Binary Indexed Tree
    50: "data structures",       # Segment Tree
    51: None,                    # Line Sweep
    52: "data structures",       # Ordered Set
    53: "data structures",       # Queue
    54: "data structures",       # Monotonic Queue
    55: "sortings",              # Counting Sort
    56: "interactive",           # Interactive
    57: None,                    # Brainteaser
    58: "games",                 # Game Theory
    59: None,                    # Data Stream
    60: "graphs",                # Eulerian Circuit
    61: "probabilities",         # Randomized
    62: "probabilities",         # Reservoir Sampling
    63: "shortest paths",        # Shortest Path
    64: "bitmasks",              # Bitmask
    65: "probabilities",         # Rejection Sampling
    66: "probabilities",         # Probability and Statistics
    67: "string suffix structures", # Suffix Array
    68: None,                    # Concurrency
    69: "graphs",                # Biconnected Component
    70: "graphs",                # Minimum Spanning Tree
    71: "graphs",                # Strongly Connected Component
    72: "sortings",              # Sort
}


def get_dkt_skill_for_topic(topic_id: int) -> str | None:
    """Return the Codeforces DKT skill name for a given CodeLab topic ID.

    Returns ``None`` if the topic has no reasonable DKT equivalent.
    The caller should skip this topic during sequence construction.
    """
    return TOPIC_ID_TO_DKT_SKILL.get(topic_id)

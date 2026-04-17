"""
Controlled mutation functions to generate buggy code from correct solutions.
Each mutation function takes the correct method source (ignored) and returns a mutated method body string.
"""

from typing import Callable

MutationFunc = Callable[[str], str]

# ============================================================
# Helper: create a comment-wrapper to generate many variants
# ============================================================


def _with_comment(base_func: MutationFunc, variant_id: int) -> MutationFunc:
    """Wrap a base mutator to add a unique comment, producing a distinct source variant."""

    def wrapper(_: str) -> str:
        body = base_func(_)
        # Insert a comment line before the method definition (will be indented later)
        return f"# variant {variant_id}\n{body}"

    return wrapper


# ============================================================
# Base mutators store (problem_id -> label -> list of base functions)
# ============================================================

# We'll define them per problem. The correct method bodies are embedded directly in each function.


# =================== Problem 1: Two Sum ===================
def two_sum_logic_base(_: str) -> str:
    return """def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement not in seen:
                return [i, i]
            seen[num] = i
        return []"""


def two_sum_loop_base(_: str) -> str:
    return """def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        i = 0
        while i < len(nums):
            num = nums[i]
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []"""


def two_sum_mem_base(_: str) -> str:
    return """def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[999999], i]
            seen[num] = i
        return []"""


def two_sum_rec_base(_: str) -> str:
    return """def twoSum(self, nums: List[int], target: int) -> List[int]:
        def helper():
            helper()
        helper()
        return []"""


# =================== Problem 9: Palindrome Number ===================
def palindrome_logic_base(_: str) -> str:
    return """def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        original = x
        reversed_num = 0
        while x > 0:
            reversed_num = reversed_num * 10 + x % 10
            x //= 10
        return original != reversed_num"""


def palindrome_loop_base(_: str) -> str:
    return """def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        original = x
        reversed_num = 0
        while x > 0:
            reversed_num = reversed_num * 10 + x % 10
        return original == reversed_num"""


def palindrome_mem_base(_: str) -> str:
    return """def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        original = x
        reversed_num = 0
        while x > 0:
            reversed_num = reversed_num * 10 + (1 // 0)
            x //= 10
        return original == reversed_num"""


def palindrome_rec_base(_: str) -> str:
    return """def isPalindrome(self, x: int) -> bool:
        def helper():
            helper()
        helper()
        return True"""


# =================== Problem 13: Roman to Integer ===================
def roman_logic_base(_: str) -> str:
    return """def romanToInt(self, s: str) -> int:
        roman_map = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
        total = 0
        prev_value = 0
        for char in reversed(s):
            value = roman_map[char]
            total += value
            prev_value = value
        return total"""


def roman_loop_base(_: str) -> str:
    return """def romanToInt(self, s: str) -> int:
        roman_map = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
        total = 0
        prev_value = 0
        chars = list(s)
        i = len(chars) - 1
        while i >= 0:
            char = chars[i]
            value = roman_map[char]
            if value < prev_value:
                total -= value
            else:
                total += value
            prev_value = value
        return total"""


def roman_mem_base(_: str) -> str:
    return """def romanToInt(self, s: str) -> int:
        roman_map = {'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
        total = 0
        prev_value = 0
        for char in reversed(s):
            value = roman_map.get(char, roman_map['Z'])
            if value < prev_value:
                total -= value
            else:
                total += value
            prev_value = value
        return total"""


def roman_rec_base(_: str) -> str:
    return """def romanToInt(self, s: str) -> int:
        def bad():
            bad()
        bad()
        return 0"""


# =================== Problem 20: Valid Parentheses ===================
def paren_logic_base(_: str) -> str:
    return """def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in mapping:
                if not stack or stack[-1] != mapping[char]:
                    return False
                # skip pop
            else:
                stack.append(char)
        return not stack"""


def paren_loop_base(_: str) -> str:
    return """def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        i = 0
        while i < len(s):
            char = s[i]
            if char in mapping:
                if not stack or stack[-1] != mapping[char]:
                    return False
                stack.pop()
            else:
                stack.append(char)
        return not stack"""


def paren_mem_base(_: str) -> str:
    return """def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in mapping:
                if stack[-1] != mapping[char]:
                    return False
                stack.pop()
            else:
                stack.append(char)
        return not stack"""


def paren_rec_base(_: str) -> str:
    return """def isValid(self, s: str) -> bool:
        def helper():
            helper()
        helper()
        return False"""


# =================== Problem 27: Remove Element ===================
def remove_logic_base(_: str) -> str:
    return """def removeElement(self, nums: List[int], val: int) -> int:
        i = 0
        for j in range(len(nums)):
            if nums[j] == val:
                nums[i] = nums[j]
                i += 1
        return i"""


def remove_loop_base(_: str) -> str:
    return """def removeElement(self, nums: List[int], val: int) -> int:
        i = 0
        j = 0
        while j < len(nums):
            if nums[j] != val:
                nums[i] = nums[j]
                i += 1
            # missing j += 1
        return i"""


def remove_mem_base(_: str) -> str:
    return """def removeElement(self, nums: List[int], val: int) -> int:
        i = 0
        for j in range(len(nums)):
            if nums[j + 1] != val:
                nums[i] = nums[j]
                i += 1
        return i"""


def remove_rec_base(_: str) -> str:
    return """def removeElement(self, nums: List[int], val: int) -> int:
        def helper():
            helper()
        helper()
        return 0"""


# ============================================================
# New problems (10)
# ============================================================


# ------------------- Problem 14: Longest Common Prefix -------------------
def lcp_logic_base(_: str) -> str:
    return """def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
        return prefix[::-1]"""  # bug: return reversed


def lcp_loop_base(_: str) -> str:
    return """def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
            # missing continue? Actually this is fine; another bug: infinite while if prefix never reduces? prefix[:-1] reduces eventually. To cause TLE, use while True without break modification:
        return prefix"""


def lcp_mem_base(_: str) -> str:
    return """def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-999]  # huge slice -> empty quickly but okay
                if not prefix:
                    return ""
        # IndexError: access strs[100]
        x = strs[100]
        return prefix"""


def lcp_rec_base(_: str) -> str:
    return '''def longestCommonPrefix(self, strs: List[str]) -> str:
        def rec():
            rec()
        rec()
        return ""'''


# ------------------- Problem 21: Merge Two Sorted Lists -------------------
def merge_logic_base(_: str) -> str:
    return """def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        current = dummy
        while list1 and list2:
            if list1.val < list2.val:
                current.next = list2  # bug: reversed assignment
                list1 = list1.next
            else:
                current.next = list1
                list2 = list2.next
            current = current.next
        current.next = list1 or list2
        return dummy.next"""


def merge_loop_base(_: str) -> str:
    return """def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        current = dummy
        while True:  # infinite loop, no condition check
            if not list1 and not list2:
                break
            if list1 and list2:
                if list1.val < list2.val:
                    current.next = list1
                    list1 = list1.next
                else:
                    current.next = list2
                    list2 = list2.next
                current = current.next
            elif list1:
                current.next = list1
                break
            else:
                current.next = list2
                break
        return dummy.next"""


def merge_mem_base(_: str) -> str:
    return """def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        current = dummy
        while list1 and list2:
            if list1.val < list2.val:
                current.next = list1
                list1 = list1.next
            else:
                current.next = list2
                list2 = list2.next
            current = current.next
        # Bug: access next of None
        current.next = list1.next.next if list1 else list2.next.next
        return dummy.next"""


def merge_rec_base(_: str) -> str:
    return """def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        def rec(l1, l2):
            rec(l1, l2)  # infinite
        return rec(list1, list2)"""


# ------------------- Problem 26: Remove Duplicates from Sorted Array -------------------
def remove_dup_logic_base(_: str) -> str:
    return """def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0
        i = 0
        for j in range(1, len(nums)):
            if nums[j] != nums[i]:
                i += 1
                nums[i] = nums[j]
        return i  # bug: should be i+1"""


def remove_dup_loop_base(_: str) -> str:
    return """def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0
        i = 0
        j = 1
        while j < len(nums):
            if nums[j] != nums[i]:
                i += 1
                nums[i] = nums[j]
            # missing j += 1
        return i + 1"""


def remove_dup_mem_base(_: str) -> str:
    return """def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0
        i = 0
        for j in range(1, len(nums)):
            if nums[j + 1] != nums[i]:  # IndexError at end
                i += 1
                nums[i] = nums[j]
        return i + 1"""


def remove_dup_rec_base(_: str) -> str:
    return """def removeDuplicates(self, nums: List[int]) -> int:
        def rec(idx):
            if idx >= len(nums):
                return 0
            if nums[idx] == nums[idx-1]:
                return rec(idx)
            return rec(idx+1)
        return rec(0)  # idx-1 out of range on first call, also infinite"""


# ------------------- Problem 28: strStr -------------------
def strstr_logic_base(_: str) -> str:
    return """def strStr(self, haystack: str, needle: str) -> int:
        if not needle:
            return 0
        for i in range(len(haystack) - len(needle) + 1):
            if haystack[i:i+len(needle)] != needle:
                return i  # wrong: return on first mismatch
        return -1"""


def strstr_loop_base(_: str) -> str:
    return """def strStr(self, haystack: str, needle: str) -> int:
        if not needle:
            return 0
        i = 0
        while i < len(haystack) - len(needle) + 1:
            if haystack[i:i+len(needle)] == needle:
                return i
            # missing i += 1 -> infinite loop
        return -1"""


def strstr_mem_base(_: str) -> str:
    return """def strStr(self, haystack: str, needle: str) -> int:
        if not needle:
            return 0
        for i in range(len(haystack) - len(needle) + 1):
            # Access beyond haystack length intentionally: slice okay but indexing not
            if haystack[i + 100] == 'x':  # IndexError
                pass
        return -1"""


def strstr_rec_base(_: str) -> str:
    return """def strStr(self, haystack: str, needle: str) -> int:
        def rec(i):
            return rec(i)  # infinite
        return rec(0)"""


# ------------------- Problem 35: Search Insert Position -------------------
def search_logic_base(_: str) -> str:
    return """def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return -1  # bug: should return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return left"""


def search_loop_base(_: str) -> str:
    return """def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while True:  # infinite loop
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return left"""


def search_mem_base(_: str) -> str:
    return """def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums)
        while left <= right:
            mid = (left + right) // 2
            # Access nums at invalid index when right == len(nums)
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return left"""


def search_rec_base(_: str) -> str:
    return """def searchInsert(self, nums: List[int], target: int) -> int:
        def rec(l, r):
            rec(l, r)  # infinite
        return rec(0, len(nums)-1)"""


# ------------------- Problem 58: Length of Last Word -------------------
def lw_logic_base(_: str) -> str:
    return """def lengthOfLastWord(self, s: str) -> int:
        words = s.strip().split()
        return 0  # always zero"""


def lw_loop_base(_: str) -> str:
    return """def lengthOfLastWord(self, s: str) -> int:
        s = s.strip()
        i = len(s) - 1
        length = 0
        while i >= 0:
            if s[i] == ' ':
                break
            length += 1
            # missing i -= 1 -> infinite loop
        return length"""


def lw_mem_base(_: str) -> str:
    return """def lengthOfLastWord(self, s: str) -> int:
        words = s.strip().split()
        # Index error if no words
        return len(words[100])"""


def lw_rec_base(_: str) -> str:
    return """def lengthOfLastWord(self, s: str) -> int:
        def rec():
            rec()
        rec()
        return 0"""


# ------------------- Problem 66: Plus One -------------------
def plus_logic_base(_: str) -> str:
    return """def plusOne(self, digits: List[int]) -> List[int]:
        for i in range(len(digits) - 1, -1, -1):
            if digits[i] < 9:
                digits[i] = digits[i]  # no change
                return digits
            digits[i] = 0
        return [1] + digits"""


def plus_loop_base(_: str) -> str:
    return """def plusOne(self, digits: List[int]) -> List[int]:
        i = len(digits) - 1
        while i >= 0:
            if digits[i] < 9:
                digits[i] += 1
                return digits
            digits[i] = 0
            # missing i -= 1 -> infinite loop
        return [1] + digits"""


def plus_mem_base(_: str) -> str:
    return """def plusOne(self, digits: List[int]) -> List[int]:
        for i in range(len(digits) - 1, -1, -1):
            if digits[i] < 9:
                digits[i] += 1
                return digits
            digits[i] = 0
        # Index error: access digits[100]
        _ = digits[100]
        return [1] + digits"""


def plus_rec_base(_: str) -> str:
    return """def plusOne(self, digits: List[int]) -> List[int]:
        def rec(idx):
            rec(idx)  # infinite
        rec(len(digits)-1)
        return digits"""


# ------------------- Problem 67: Add Binary -------------------
def addbin_logic_base(_: str) -> str:
    return """def addBinary(self, a: str, b: str) -> str:
        i, j = len(a) - 1, len(b) - 1
        carry = 0
        res = []
        while i >= 0 or j >= 0 or carry:
            total = carry
            if i >= 0:
                total += int(a[i])
                i -= 1
            if j >= 0:
                total += int(b[j])
                j -= 1
            res.append(str(total % 2))
            carry = total // 2
        return ''  # bug: empty string"""


def addbin_loop_base(_: str) -> str:
    return """def addBinary(self, a: str, b: str) -> str:
        i, j = len(a) - 1, len(b) - 1
        carry = 0
        res = []
        while True:  # infinite loop; proper condition missing
            if i < 0 and j < 0 and carry == 0:
                break
            total = carry
            if i >= 0:
                total += int(a[i])
                i -= 1
            if j >= 0:
                total += int(b[j])
                j -= 1
            res.append(str(total % 2))
            carry = total // 2
        return ''.join(reversed(res))"""


def addbin_mem_base(_: str) -> str:
    return """def addBinary(self, a: str, b: str) -> str:
        i, j = len(a) - 1, len(b) - 1
        carry = 0
        res = []
        while i >= 0 or j >= 0 or carry:
            total = carry
            if i >= 0:
                total += int(a[i+100])  # IndexError
                i -= 1
            if j >= 0:
                total += int(b[j])
                j -= 1
            res.append(str(total % 2))
            carry = total // 2
        return ''.join(reversed(res))"""


def addbin_rec_base(_: str) -> str:
    return '''def addBinary(self, a: str, b: str) -> str:
        def rec():
            rec()
        rec()
        return "0"'''


# ------------------- Problem 69: Sqrt(x) -------------------
def sqrt_logic_base(_: str) -> str:
    return """def mySqrt(self, x: int) -> int:
        if x < 2:
            return x
        return x // 2  # wrong"""


def sqrt_loop_base(_: str) -> str:
    return """def mySqrt(self, x: int) -> int:
        if x < 2:
            return x
        left, right = 0, x // 2
        while left <= right:
            mid = (left + right) // 2
            # condition missing updates -> infinite
        return right"""


def sqrt_mem_base(_: str) -> str:
    return """def mySqrt(self, x: int) -> int:
        if x < 2:
            return x
        # Division by zero
        y = 1 / 0
        return 0"""


def sqrt_rec_base(_: str) -> str:
    return """def mySqrt(self, x: int) -> int:
        def rec():
            rec()
        rec()
        return 0"""


# ------------------- Problem 70: Climbing Stairs -------------------
def climb_logic_base(_: str) -> str:
    return """def climbStairs(self, n: int) -> int:
        if n <= 2:
            return 1  # bug: should return n
        a, b = 1, 2
        for _ in range(3, n+1):
            a, b = b, a + b
        return a"""  # return wrong variable


def climb_loop_base(_: str) -> str:
    return """def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n
        a, b = 1, 2
        i = 3
        while i <= n:
            a, b = b, a + b
            # missing i += 1 -> infinite
        return b"""


def climb_mem_base(_: str) -> str:
    return """def climbStairs(self, n: int) -> int:
        if n < 0:
            return 0
        # Access undefined list
        arr = [0,1,2]
        return arr[n]  # IndexError for n>2"""


def climb_rec_base(_: str) -> str:
    return """def climbStairs(self, n: int) -> int:
        def rec(n):
            rec(n)  # infinite
        return rec(n)"""


# ============================================================
# Base MUTATIONS dictionary (only base functions)
# ============================================================

BASE_MUTATIONS = {
    1: {
        "logic_error": [two_sum_logic_base],
        "loop_condition_error": [two_sum_loop_base],
        "memory_reference_error": [two_sum_mem_base],
        "recursion_error": [two_sum_rec_base],
    },
    9: {
        "logic_error": [palindrome_logic_base],
        "loop_condition_error": [palindrome_loop_base],
        "memory_reference_error": [palindrome_mem_base],
        "recursion_error": [palindrome_rec_base],
    },
    13: {
        "logic_error": [roman_logic_base],
        "loop_condition_error": [roman_loop_base],
        "memory_reference_error": [roman_mem_base],
        "recursion_error": [roman_rec_base],
    },
    14: {
        "logic_error": [lcp_logic_base],
        "loop_condition_error": [lcp_loop_base],
        "memory_reference_error": [lcp_mem_base],
        "recursion_error": [lcp_rec_base],
    },
    20: {
        "logic_error": [paren_logic_base],
        "loop_condition_error": [paren_loop_base],
        "memory_reference_error": [paren_mem_base],
        "recursion_error": [paren_rec_base],
    },
    21: {
        "logic_error": [merge_logic_base],
        "loop_condition_error": [merge_loop_base],
        "memory_reference_error": [merge_mem_base],
        "recursion_error": [merge_rec_base],
    },
    26: {
        "logic_error": [remove_dup_logic_base],
        "loop_condition_error": [remove_dup_loop_base],
        "memory_reference_error": [remove_dup_mem_base],
        "recursion_error": [remove_dup_rec_base],
    },
    27: {
        "logic_error": [remove_logic_base],
        "loop_condition_error": [remove_loop_base],
        "memory_reference_error": [remove_mem_base],
        "recursion_error": [remove_rec_base],
    },
    28: {
        "logic_error": [strstr_logic_base],
        "loop_condition_error": [strstr_loop_base],
        "memory_reference_error": [strstr_mem_base],
        "recursion_error": [strstr_rec_base],
    },
    35: {
        "logic_error": [search_logic_base],
        "loop_condition_error": [search_loop_base],
        "memory_reference_error": [search_mem_base],
        "recursion_error": [search_rec_base],
    },
    58: {
        "logic_error": [lw_logic_base],
        "loop_condition_error": [lw_loop_base],
        "memory_reference_error": [lw_mem_base],
        "recursion_error": [lw_rec_base],
    },
    66: {
        "logic_error": [plus_logic_base],
        "loop_condition_error": [plus_loop_base],
        "memory_reference_error": [plus_mem_base],
        "recursion_error": [plus_rec_base],
    },
    67: {
        "logic_error": [addbin_logic_base],
        "loop_condition_error": [addbin_loop_base],
        "memory_reference_error": [addbin_mem_base],
        "recursion_error": [addbin_rec_base],
    },
    69: {
        "logic_error": [sqrt_logic_base],
        "loop_condition_error": [sqrt_loop_base],
        "memory_reference_error": [sqrt_mem_base],
        "recursion_error": [sqrt_rec_base],
    },
    70: {
        "logic_error": [climb_logic_base],
        "loop_condition_error": [climb_loop_base],
        "memory_reference_error": [climb_mem_base],
        "recursion_error": [climb_rec_base],
    },
    83: {
        "logic_error": [
            lambda _: (
                """def deleteDuplicates(self, head: Optional[ListNode]) -> Optional[ListNode]:
        current = head
        while current and current.next:
            if current.val == current.next.val:
                current.next = current.next.next
            else:
                current = current.next
        return head""".replace(
                    "current.next = current.next.next", "current = current.next"
                )
            )
        ],  # simple bug
        "loop_condition_error": [
            lambda _: (
                """def deleteDuplicates(self, head: Optional[ListNode]) -> Optional[ListNode]:
        current = head
        while current and current.next:
            if current.val == current.next.val:
                current.next = current.next.next
            # missing else advance
        return head"""
            )
        ],
        "memory_reference_error": [
            lambda _: (
                """def deleteDuplicates(self, head: Optional[ListNode]) -> Optional[ListNode]:
        current = head
        while current and current.next:
            if current.val == current.next.val:
                current.next = current.next.next
            else:
                current = current.next
        # access None
        x = head.next.next.val
        return head"""
            )
        ],
        "recursion_error": [
            lambda _: (
                """def deleteDuplicates(self, head: Optional[ListNode]) -> Optional[ListNode]:
        def rec(node):
            rec(node)  # infinite
        rec(head)
        return head"""
            )
        ],
    },
}

# ============================================================
# Public get_mutator with variant support (comment augmentation)
# ============================================================


def get_mutator(problem_id: int, label: str, variant_index: int = 0):
    """
    Return a mutation function for the given problem, label, and variant index.
    Base mutators are those defined in BASE_MUTATIONS.
    If variant_index exceeds available base count, a wrapper that adds a unique comment
    is returned to create a distinct source variant.
    """
    try:
        base_funcs = BASE_MUTATIONS[problem_id][label]
    except KeyError:
        return None
    if not base_funcs:
        return None
    if variant_index < len(base_funcs):
        return base_funcs[variant_index]
    # Create a wrapper around the first base mutator with a comment
    base = base_funcs[0]
    return _with_comment(base, variant_index)

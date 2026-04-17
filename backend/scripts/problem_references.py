"""
Correct reference solutions for selected seed problems.
These are clean, accepted implementations used as baseline for mutation.
"""

from typing import List, Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


# ------------------------------
# Two Sum (problem_id=1)
# ------------------------------
class TwoSumSolution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []


# ------------------------------
# Palindrome Number (problem_id=9)
# ------------------------------
class PalindromeNumberSolution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        original = x
        reversed_num = 0
        while x > 0:
            reversed_num = reversed_num * 10 + x % 10
            x //= 10
        return original == reversed_num


# ------------------------------
# Valid Parentheses (problem_id=20)
# ------------------------------
class ValidParenthesesSolution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {")": "(", "}": "{", "]": "["}
        for char in s:
            if char in mapping:
                if not stack or stack[-1] != mapping[char]:
                    return False
                stack.pop()
            else:
                stack.append(char)
        return not stack


# ------------------------------
# Roman to Integer (problem_id=13)
# ------------------------------
class RomanToIntegerSolution:
    def romanToInt(self, s: str) -> int:
        roman_map = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
        total = 0
        prev_value = 0
        for char in reversed(s):
            value = roman_map[char]
            if value < prev_value:
                total -= value
            else:
                total += value
            prev_value = value
        return total


# ------------------------------
# Remove Element (problem_id=27)
# ------------------------------
class RemoveElementSolution:
    def removeElement(self, nums: List[int], val: int) -> int:
        i = 0
        for j in range(len(nums)):
            if nums[j] != val:
                nums[i] = nums[j]
                i += 1
        return i


# ------------------------------
# Longest Common Prefix (problem_id=14)
# ------------------------------
class LongestCommonPrefixSolution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
        return prefix


# ------------------------------
# Merge Two Sorted Lists (problem_id=21)
# ------------------------------
class MergeTwoSortedListsSolution:
    def mergeTwoLists(
        self, list1: Optional[ListNode], list2: Optional[ListNode]
    ) -> Optional[ListNode]:
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
        current.next = list1 or list2
        return dummy.next


# ------------------------------
# Remove Duplicates from Sorted Array (problem_id=26)
# ------------------------------
class RemoveDuplicatesFromSortedArraySolution:
    def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0
        i = 0
        for j in range(1, len(nums)):
            if nums[j] != nums[i]:
                i += 1
                nums[i] = nums[j]
        return i + 1


# ------------------------------
# Find the Index of the First Occurrence in a String (problem_id=28)
# ------------------------------
class StrStrSolution:
    def strStr(self, haystack: str, needle: str) -> int:
        if not needle:
            return 0
        for i in range(len(haystack) - len(needle) + 1):
            if haystack[i : i + len(needle)] == needle:
                return i
        return -1


# ------------------------------
# Search Insert Position (problem_id=35)
# ------------------------------
class SearchInsertSolution:
    def searchInsert(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return left


# ------------------------------
# Length of Last Word (problem_id=58)
# ------------------------------
class LengthOfLastWordSolution:
    def lengthOfLastWord(self, s: str) -> int:
        words = s.strip().split()
        return len(words[-1]) if words else 0


# ------------------------------
# Plus One (problem_id=66)
# ------------------------------
class PlusOneSolution:
    def plusOne(self, digits: List[int]) -> List[int]:
        for i in range(len(digits) - 1, -1, -1):
            if digits[i] < 9:
                digits[i] += 1
                return digits
            digits[i] = 0
        return [1] + digits


# ------------------------------
# Add Binary (problem_id=67)
# ------------------------------
class AddBinarySolution:
    def addBinary(self, a: str, b: str) -> str:
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
        return "".join(reversed(res))


# ------------------------------
# Sqrt(x) (problem_id=69)
# ------------------------------
class MySqrtSolution:
    def mySqrt(self, x: int) -> int:
        if x < 2:
            return x
        left, right = 0, x // 2
        while left <= right:
            mid = (left + right) // 2
            if mid * mid == x:
                return mid
            elif mid * mid < x:
                left = mid + 1
            else:
                right = mid - 1
        return right


# ------------------------------
# Climbing Stairs (problem_id=70)
# ------------------------------
class ClimbStairsSolution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        return b


# ------------------------------
# Remove Duplicates from Sorted List (problem_id=83)
# ------------------------------
class DeleteDuplicatesSolution:
    def deleteDuplicates(self, head: Optional[ListNode]) -> Optional[ListNode]:
        current = head
        while current and current.next:
            if current.val == current.next.val:
                current.next = current.next.next
            else:
                current = current.next
        return head


# Mapping for easy access
SOLUTIONS = {
    1: TwoSumSolution(),
    9: PalindromeNumberSolution(),
    13: RomanToIntegerSolution(),
    14: LongestCommonPrefixSolution(),
    20: ValidParenthesesSolution(),
    21: MergeTwoSortedListsSolution(),
    26: RemoveDuplicatesFromSortedArraySolution(),
    27: RemoveElementSolution(),
    28: StrStrSolution(),
    35: SearchInsertSolution(),
    58: LengthOfLastWordSolution(),
    66: PlusOneSolution(),
    67: AddBinarySolution(),
    69: MySqrtSolution(),
    70: ClimbStairsSolution(),
    83: DeleteDuplicatesSolution(),
}

# Method names per problem
METHOD_NAMES = {
    1: "twoSum",
    9: "isPalindrome",
    13: "romanToInt",
    14: "longestCommonPrefix",
    20: "isValid",
    21: "mergeTwoLists",
    26: "removeDuplicates",
    27: "removeElement",
    28: "strStr",
    35: "searchInsert",
    58: "lengthOfLastWord",
    66: "plusOne",
    67: "addBinary",
    69: "mySqrt",
    70: "climbStairs",
    83: "deleteDuplicates",
}

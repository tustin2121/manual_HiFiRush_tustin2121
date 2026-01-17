from typing import Optional, TYPE_CHECKING
from BaseClasses import MultiWorld, Item, Location

if TYPE_CHECKING:
    from ..Items import ManualItem
    from ..Locations import ManualLocation

# Use this if you want to override the default behavior of is_option_enabled
# Return True to enable the category, False to disable it, or None to use the default behavior
def before_is_category_enabled(multiworld: MultiWorld, player: int, category_name: str) -> Optional[bool]:
    from ..Data import category_table
    from ..Helpers import get_option_value, format_to_valid_identifier
    
    category_data = category_table.get(category_name, {})
    total = 0
    score = 0
    if "requires" in category_data:
        for opt, val in category_data["requires"].items():
            total += 1
            opt = format_to_valid_identifier(opt)
            if get_option_value(multiworld, player, opt) >= val:
                score += 1
        if total > 0:
            # return total == score
            return score > 0
    return None

# Use this if you want to override the default behavior of is_option_enabled
# Return True to enable the item, False to disable it, or None to use the default behavior
def before_is_item_enabled(multiworld: MultiWorld, player: int, item: "ManualItem") -> Optional[bool]:
    return None

# Use this if you want to override the default behavior of is_option_enabled
# Return True to enable the location, False to disable it, or None to use the default behavior
def before_is_location_enabled(multiworld: MultiWorld, player: int, location: "ManualLocation") -> Optional[bool]:
    return None

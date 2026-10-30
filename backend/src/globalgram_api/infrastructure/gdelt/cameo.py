from globalgram_api.domain.events.model import Category

ROOT_NOUNS: dict[str, str] = {
    "01": "Public statement",
    "02": "Appeal",
    "03": "Pledge of cooperation",
    "04": "Consultation",
    "05": "Diplomatic cooperation",
    "06": "Material cooperation",
    "07": "Aid",
    "08": "Concession",
    "09": "Investigation",
    "10": "Demand",
    "11": "Disapproval",
    "12": "Rejection",
    "13": "Threat",
    "14": "Protest",
    "15": "Show of force",
    "16": "Reduced relations",
    "17": "Coercion",
    "18": "Assault",
    "19": "Fighting",
    "20": "Mass violence",
}


def categorize(root: str, base: str, code: str) -> Category:
    """Categorize a GDELT event based on its CAMEO codes."""
    # Check rules in order
    if base == "073" or code == "0233":
        return Category.DISASTER
    if base in {"061", "071", "163"}:
        return Category.ECONOMY
    if root in {"13", "15", "17", "18", "19", "20"}:
        return Category.CONFLICT
    if root in ROOT_NOUNS:
        return Category.POLITICS
    return Category.OTHER

# Base price and price coefficients for various locations
base_price = 1000
price_coefs = {
    (1, 360): 1,        # parter
    (361, 444): 1.2,    # parter (orchestra hole)
    (445, 453): 1.2,    # benuar (left)
    (454, 462): 1.2,    # benuar (right)
    (463, 618): 1.2,    # amphitheatre
    (619, 707): 0.5,    # mezzanine (left) (belyetazh)
    (708, 796): 0.5,    # mezzanine (right)
    (797, 811): 0.5,    # mezzanine (middle)
    (812, 890): 0.4,    # balcony 1 (left)
    (891, 969): 0.4,    # balcony 1 (right)
    (970, 1036): 0.35,  # balcony 2 (left)
    (1037, 1080): 0.4,  # balcony 2 (middle)
    (1081, 1147): 0.35  # balcony
}

token_hash = '693e5625e7cd218b9736e0d16892f3cd'

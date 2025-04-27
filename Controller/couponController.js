const { supabase } = require("../config/supabaseClient");

// Helper function for error responses
const errorResponse = (res, status, message, error) => {
  console.error(`${message} error:`, error);
  return res.status(status).json({ message, error: error.message });
};

// Helper function to format a date
const formatDate = (date) => new Date(date).toISOString();

const getAllCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const { isActive, type, search } = req.query;

    let query = supabase.from("coupons").select("*", { count: "exact" });

    if (isActive !== undefined)
      query = query.eq("is_active", isActive === "true");
    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("code", `%${search}%`);

    const {
      data: coupons,
      error,
      count: totalCount,
    } = await query
      .order("created_at", { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error)
      return errorResponse(res, 400, "Error retrieving coupons", error);

    return res.status(200).json({
      message: "Coupons retrieved successfully",
      data: coupons,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return errorResponse(res, 404, "Coupon not found", error);

    return res.status(200).json({
      message: "Coupon retrieved successfully",
      data: coupon,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      isActive = true,
      appliesTo,
      applicableIds = [],
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "code",
      "type",
      "value",
      "validFrom",
      "validUntil",
      "appliesTo",
    ];
    if (
      !code ||
      !type ||
      value === undefined ||
      !validFrom ||
      !validUntil ||
      !appliesTo
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        requiredFields,
      });
    }

    // Check if coupon code already exists
    const { data: existingCoupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", code)
      .single();

    if (existingCoupon) {
      return res.status(400).json({
        message: "Coupon code already exists",
      });
    }

    // Insert new coupon
    const { data: newCoupon, error } = await supabase
      .from("coupons")
      .insert([
        {
          code,
          type,
          value,
          min_purchase: minPurchase || null,
          max_discount: maxDiscount || null,
          valid_from: formatDate(validFrom),
          valid_until: formatDate(validUntil),
          usage_limit: usageLimit || null,
          usage_count: 0,
          is_active: isActive,
          applies_to: appliesTo,
          applicable_ids: applicableIds,
        },
      ])
      .select();

    if (error) return errorResponse(res, 400, "Error creating coupon", error);

    return res.status(201).json({
      message: "Coupon created successfully",
      data: newCoupon[0],
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
      appliesTo,
      applicableIds,
    } = req.body;

    // Check if coupon exists
    const { data: existingCoupon, error: checkError } = await supabase
      .from("coupons")
      .select("id, code")
      .eq("id", id)
      .single();

    if (checkError) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // If code is changing, check if new code already exists
    if (code && code !== existingCoupon.code) {
      const { data: codeExists } = await supabase
        .from("coupons")
        .select("id")
        .eq("code", code)
        .neq("id", id)
        .single();

      if (codeExists) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
    }

    // Prepare update data
    const updateData = { updated_at: new Date().toISOString() };

    if (code) updateData.code = code;
    if (type) updateData.type = type;
    if (value !== undefined) updateData.value = value;
    if (minPurchase !== undefined)
      updateData.min_purchase = minPurchase === null ? null : minPurchase;
    if (maxDiscount !== undefined)
      updateData.max_discount = maxDiscount === null ? null : maxDiscount;
    if (validFrom) updateData.valid_from = formatDate(validFrom);
    if (validUntil) updateData.valid_until = formatDate(validUntil);
    if (usageLimit !== undefined)
      updateData.usage_limit = usageLimit === null ? null : usageLimit;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (appliesTo) updateData.applies_to = appliesTo;
    if (applicableIds) updateData.applicable_ids = applicableIds;

    // Update coupon
    const { data: updatedCoupon, error } = await supabase
      .from("coupons")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) return errorResponse(res, 400, "Error updating coupon", error);

    return res.status(200).json({
      message: "Coupon updated successfully",
      data: updatedCoupon[0],
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const { data: existingCoupon, error: checkError } = await supabase
      .from("coupons")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Delete coupon
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) return errorResponse(res, 400, "Error deleting coupon", error);

    return res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ message: "isActive field is required" });
    }

    // Update coupon status
    const { data: updatedCoupon, error } = await supabase
      .from("coupons")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error)
      return errorResponse(res, 400, "Error updating coupon status", error);

    return res.status(200).json({
      message: `Coupon ${isActive ? "activated" : "deactivated"} successfully`,
      data: updatedCoupon[0],
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const { cartTotal, productIds = [] } = req.body;

    // Find the coupon
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Coupon not found or inactive",
        valid: false,
      });
    }

    // Check expiration
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);

    if (now < validFrom || now > validUntil) {
      return res.status(400).json({
        message: "Coupon is expired or not yet active",
        valid: false,
      });
    }

    // Check usage limit
    if (
      coupon.usage_limit !== null &&
      coupon.usage_count >= coupon.usage_limit
    ) {
      return res.status(400).json({
        message: "Coupon usage limit has been reached",
        valid: false,
      });
    }

    // Check minimum purchase
    if (coupon.min_purchase !== null && cartTotal < coupon.min_purchase) {
      return res.status(400).json({
        message: `Minimum purchase amount of ${coupon.min_purchase} not met`,
        valid: false,
        minimumAmount: coupon.min_purchase,
      });
    }

    // Check if applies to specific products or categories
    if (coupon.applies_to !== "all" && productIds.length > 0) {
      if (coupon.applicable_ids && coupon.applicable_ids.length > 0) {
        const hasMatch = productIds.some((id) =>
          coupon.applicable_ids.includes(id)
        );
        if (!hasMatch) {
          return res.status(400).json({
            message: "Coupon does not apply to the products in cart",
            valid: false,
          });
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (coupon.type === "percentage") {
      discountAmount = (cartTotal * coupon.value) / 100;
      // Apply max discount if set
      if (
        coupon.max_discount !== null &&
        discountAmount > coupon.max_discount
      ) {
        discountAmount = coupon.max_discount;
      }
    } else if (coupon.type === "fixed") {
      discountAmount = Math.min(coupon.value, cartTotal);
    }

    return res.status(200).json({
      message: "Coupon is valid",
      valid: true,
      discount: {
        type: coupon.type,
        value: coupon.value,
        amount: discountAmount,
      },
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
      },
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

module.exports = {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
};

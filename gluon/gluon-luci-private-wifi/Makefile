include $(TOPDIR)/rules.mk

PKG_NAME:=gluon-luci-private-wifi
PKG_VERSION:=0.1
PKG_RELEASE:=1

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/gluon-luci-private-wifi
  SECTION:=gluon
  CATEGORY:=Gluon
  DEPENDS:=+gluon-luci-admin
  TITLE:=UI for activating a private WLAN
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/gluon-luci-private-wifi/install
	$(CP) ./files/* $(1)/
endef

$(eval $(call BuildPackage,gluon-luci-private-wifi))

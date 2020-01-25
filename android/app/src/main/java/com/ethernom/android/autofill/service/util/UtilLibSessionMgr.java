package com.ethernom.android.autofill.service.util;

import android.content.Context;
import android.content.SharedPreferences;


public class UtilLibSessionMgr {
    private SharedPreferences pref;
    private SharedPreferences.Editor editor;

    private static final String REG_LIB_PREF_NAME = "FM_RegLib_Pref";
    public UtilLibSessionMgr(Context context) {
        try {
            int PRIVATE_MODE = 0;
            pref = context.getSharedPreferences(REG_LIB_PREF_NAME, PRIVATE_MODE);
            editor = pref.edit();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String packageName = "package_name";

    public String getPackage() {
        return pref.getString(packageName, "");
    }

    public void setPackageName(String data) {
        editor.putString(packageName, data);
        editor.commit();
    }


}

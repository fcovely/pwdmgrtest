package com.ethernom.android.autofill.service.adapter;

import android.view.View;

import com.ethernom.android.autofill.service.AuthActivity;

public interface  RecyclerViewClickListener {
    void onClick(int position, AuthActivity.EtherEntry etherEntry);
}

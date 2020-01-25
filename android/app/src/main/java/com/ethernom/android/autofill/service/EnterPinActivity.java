package com.ethernom.android.autofill.service;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.chaos.view.PinView;
import com.ethernom.android.autofill.service.adapter.OnHomePressedListener;
import com.ethernom.android.autofill.service.adapter.PINCallBack;
import com.ethernom.android.autofill.service.util.Constant;
import com.ethernom.android.autofill.service.util.HomeWatcher;
import com.psdmgr.R;

import java.util.Objects;

public class EnterPinActivity extends AppCompatActivity implements PINCallBack {

    private Toolbar enterPinToolbar;
    @SuppressLint("StaticFieldLeak")
    private TextView txtErrPin;
    private Button btnBack, btnNext;
    private PinView pinView;
    private LinearLayout lnPin;

    private EthBLEClient BLEClient;

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_enter_pin);
        initProps();
        Constant.PIN_NOT_MATCH = true;
        Constant.entPinCxt = this;
        setSupportActionBar(enterPinToolbar);
        Objects.requireNonNull(getSupportActionBar()).setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setDisplayShowHomeEnabled(true);
        pinView.addTextChangedListener(textWatcher());
        pinView.setFocusable(true);
        lnPin.setOnClickListener(v -> {
            hideKeyboard(this);
        });
        btnNext.setOnClickListener(v -> {
            if (Objects.requireNonNull(pinView.getText()).length() == 6) {
                String[] data = {pinView.getText().toString()};
                Constant.ethBLEClient.WriteDataToCard(EthBLEClient.H2C_RPLY_PIN_ENTRY, data);
            }
        });
        btnBack.setOnClickListener(v -> {
            finish();
        });

    }

    @Override
    protected void onResume() {
        super.onResume();
        Constant.appState = false;
        handleHomePress();
    }

    private void handleHomePress(){
        HomeWatcher mHomeWatcher = new HomeWatcher(this);
        mHomeWatcher.setOnHomePressedListener(new OnHomePressedListener() {
            @Override
            public void onHomePressed() {
                // do something here...
                try {
                    BLEClient.onDisConnect();
                    Constant.appState = true;
                    finishAffinity();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onHomeLongPressed() {
                Log.d("xxx", "onHomeLongPressed");
            }
        });
        mHomeWatcher.startWatch();
    }

    @Override
    protected void onStop() {
        super.onStop();
        Constant.PIN_NOT_MATCH = false;
        finish();
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
        }
        return super.onOptionsItemSelected(item);
    }

    private void initProps() {
        enterPinToolbar = findViewById(R.id.enterPinToolbar);
        txtErrPin = findViewById(R.id.txtErrPin);
        btnBack = findViewById(R.id.btnBack);
        btnNext = findViewById(R.id.btnNext);
        pinView = findViewById(R.id.pinView);
        lnPin = findViewById(R.id.lnPin);
        txtErrPin.setVisibility(View.GONE);


        BLEClient = new EthBLEClient();

    }

    private TextWatcher textWatcher() {
        return new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (s.length() < 6) enableBtnNext(false);
                else enableBtnNext(true);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        };
    }

    private void enableBtnNext(Boolean enable) {
        if (enable) {
            btnNext.setBackground(getDrawable(R.drawable.bg_btn_enable));
            hideKeyboard(this);
        } else {
            btnNext.setBackground(getDrawable(R.drawable.bg_btn_disable));

        }
    }

    public static void hideKeyboard(Activity activity) {
        View view = activity.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }
    }




    @Override
    public void onPINNotMatch() {
        Log.d("xxx", "TOnyyyy ");
        runOnUiThread(() -> {
            txtErrPin.setVisibility(View.VISIBLE);
            btnNext.setBackground(getDrawable(R.drawable.bg_btn_disable));
            pinView.setText("");
        });


    }

    @Override
    public void onPINMatch() {
        Log.d("xxx", "uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
        finish();

    }



//    @Override
//    public void onReplyPinNotMatch(Boolean isMatch) {
//        Log.d("Sophatnith", isMatch.toString());
//        if (!isMatch) {
//
//
//
//        }else finish();
//    }
}
